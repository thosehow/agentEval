import threading
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.db.session import get_session_factory
from app.models import (
    CaseResult,
    Dataset,
    DatasetCase,
    EvaluationRun,
    RunKind,
    RunStatus,
    RunStep,
    StepType,
    User,
)
from app.services.gemini_agent import GeminiAgentService, GeminiQuotaExceededError
from app.services.tooling import ToolExecutor


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


class RunExecutor:
    @staticmethod
    def _record_failed_case(
        db: Session,
        *,
        run: EvaluationRun,
        case: DatasetCase,
        failure_reason: str,
    ) -> None:
        db.add(
            CaseResult(
                run_id=run.id,
                dataset_case_id=case.id,
                prompt_snapshot=case.prompt,
                expected_behavior_snapshot=case.expected_behavior,
                criterion_type=case.criterion_type,
                output_text=None,
                score=0.0,
                passed=False,
                failure_reason=failure_reason,
                latency_ms=None,
                cost_usd=0.0,
                prompt_tokens=0,
                completion_tokens=0,
                total_tokens=0,
                model_name=run.model_name,
                raw_response={"error": failure_reason},
            )
        )

    @staticmethod
    def _finalize_benchmark_run(
        db: Session,
        *,
        run: EvaluationRun,
        totals: dict[str, float | int],
        total_cases: int,
        status: RunStatus,
        error_message: str | None = None,
    ) -> None:
        normalized_total_cases = total_cases or 1
        run.total_score = round(float(totals["score"]) / normalized_total_cases, 2)
        run.success_rate = round(float(totals["passed"]) * 100 / normalized_total_cases, 2)
        run.avg_latency_ms = (
            round(float(totals["latency_ms"]) / normalized_total_cases, 2) if totals["latency_ms"] else 0.0
        )
        run.total_cost_usd = round(float(totals["cost_usd"]), 6)
        run.prompt_tokens = int(totals["prompt_tokens"])
        run.completion_tokens = int(totals["completion_tokens"])
        run.total_tokens = int(totals["total_tokens"])
        run.succeeded_cases = int(totals["passed"])
        run.failed_cases = int(totals["failed"])
        run.status = status
        run.error_message = error_message
        run.completed_at = utcnow()
        db.commit()

    @classmethod
    def launch(cls, run_id: str) -> None:
        thread = threading.Thread(target=cls._run_in_thread, args=(run_id,), daemon=True)
        thread.start()

    @classmethod
    def recover_stuck_runs(cls, db: Session) -> None:
        stuck_runs = db.scalars(
            select(EvaluationRun).where(EvaluationRun.status == RunStatus.RUNNING)
        ).all()
        for run in stuck_runs:
            run.status = RunStatus.FAILED
            run.error_message = "Run was interrupted and marked as failed during recovery."
            run.completed_at = utcnow()
        if stuck_runs:
            db.commit()

    @classmethod
    def _run_in_thread(cls, run_id: str) -> None:
        session = get_session_factory()()
        try:
            cls._execute(session, run_id)
        finally:
            session.close()

    @classmethod
    def _execute(cls, db: Session, run_id: str) -> None:
        run = db.scalar(
            select(EvaluationRun)
            .where(EvaluationRun.id == run_id)
            .options(
                selectinload(EvaluationRun.dataset).selectinload(Dataset.cases),
                selectinload(EvaluationRun.user),
                selectinload(EvaluationRun.agent_profile),
            )
        )
        if run is None:
            return
        if run.cancel_requested:
            run.status = RunStatus.CANCELLED
            run.completed_at = utcnow()
            db.commit()
            return

        run.status = RunStatus.RUNNING
        run.started_at = utcnow()
        db.commit()

        try:
            if run.run_kind == RunKind.LAB:
                cls._execute_lab_run(db, run)
            else:
                cls._execute_benchmark_run(db, run)
        except Exception as exc:
            run.status = RunStatus.FAILED
            run.error_message = str(exc)
            run.completed_at = utcnow()
            db.commit()

    @classmethod
    def _execute_lab_run(cls, db: Session, run: EvaluationRun) -> None:
        user = db.get(User, run.user_id)
        assert user is not None
        tool_executor = ToolExecutor(db, user)
        agent = GeminiAgentService()
        result = agent.run_agent(
            system_prompt=run.system_prompt_snapshot,
            user_prompt=run.user_prompt or "",
            model_name=run.model_name,
            temperature=run.temperature,
            enabled_tools=run.enabled_tools,
            tool_executor=tool_executor,
        )

        for index, step in enumerate(result.steps, start=1):
            db.add(
                RunStep(
                    run_id=run.id,
                    step_index=index,
                    step_type=step["step_type"],
                    title=step["title"],
                    content=step["content"],
                    tool_name=step["tool_name"],
                    tool_input=step["tool_input"],
                    tool_output=step["tool_output"],
                    latency_ms=step["latency_ms"],
                    raw_payload=step["raw_payload"],
                )
            )

        run.final_output = result.final_output
        run.raw_response = result.raw_response
        run.prompt_tokens = result.prompt_tokens
        run.completion_tokens = result.completion_tokens
        run.total_tokens = result.total_tokens
        run.total_cost_usd = result.total_cost_usd
        run.avg_latency_ms = result.latency_ms
        run.total_cases = 1
        run.succeeded_cases = 1
        run.failed_cases = 0
        run.success_rate = 100.0
        run.status = RunStatus.COMPLETED
        run.completed_at = utcnow()
        db.commit()

    @classmethod
    def _execute_benchmark_run(cls, db: Session, run: EvaluationRun) -> None:
        user = db.get(User, run.user_id)
        assert user is not None
        agent = GeminiAgentService()
        dataset_cases = sorted(run.dataset.cases if run.dataset else [], key=lambda item: item.id)
        run.total_cases = len(dataset_cases)
        db.commit()

        totals = {
            "score": 0.0,
            "latency_ms": 0,
            "cost_usd": 0.0,
            "prompt_tokens": 0,
            "completion_tokens": 0,
            "total_tokens": 0,
            "passed": 0,
            "failed": 0,
        }
        step_index = 1

        for case_index, case in enumerate(dataset_cases):
            db.refresh(run)
            if run.cancel_requested:
                run.status = RunStatus.CANCELLED
                run.completed_at = utcnow()
                db.commit()
                return

            tool_executor = ToolExecutor(db, user)
            try:
                execution = agent.run_agent(
                    system_prompt=run.system_prompt_snapshot,
                    user_prompt=case.prompt,
                    model_name=run.model_name,
                    temperature=run.temperature,
                    enabled_tools=run.enabled_tools,
                    tool_executor=tool_executor,
                )
                judgment = agent.judge_case(
                    expected_behavior=case.expected_behavior,
                    criterion_type=case.criterion_type,
                    actual_output=execution.final_output,
                    model_name=run.model_name,
                )
                result = CaseResult(
                    run_id=run.id,
                    dataset_case_id=case.id,
                    prompt_snapshot=case.prompt,
                    expected_behavior_snapshot=case.expected_behavior,
                    criterion_type=case.criterion_type,
                    output_text=execution.final_output,
                    score=judgment.score,
                    passed=judgment.passed,
                    failure_reason=None if judgment.passed else judgment.reason,
                    latency_ms=execution.latency_ms,
                    cost_usd=execution.total_cost_usd + judgment.cost_usd,
                    prompt_tokens=execution.prompt_tokens + judgment.prompt_tokens,
                    completion_tokens=execution.completion_tokens + judgment.completion_tokens,
                    total_tokens=execution.total_tokens + judgment.total_tokens,
                    model_name=run.model_name,
                    raw_response={
                        "generation": execution.raw_response,
                        "judge": judgment.raw_response,
                    },
                )
                db.add(result)
                db.flush()

                db.add(
                    RunStep(
                        run_id=run.id,
                        case_result_id=result.id,
                        step_index=step_index,
                        step_type=StepType.JUDGE,
                        title=case.display_id,
                        content=judgment.reason,
                        tool_name=None,
                        tool_input=None,
                        tool_output={"score": judgment.score, "passed": judgment.passed},
                        latency_ms=execution.latency_ms,
                        raw_payload={"case_id": case.display_id},
                    )
                )
                step_index += 1

                totals["score"] += judgment.score
                totals["latency_ms"] += execution.latency_ms
                totals["cost_usd"] += result.cost_usd
                totals["prompt_tokens"] += result.prompt_tokens
                totals["completion_tokens"] += result.completion_tokens
                totals["total_tokens"] += result.total_tokens
                if judgment.passed:
                    totals["passed"] += 1
                else:
                    totals["failed"] += 1
            except GeminiQuotaExceededError as exc:
                quota_message = str(exc)
                for pending_case in dataset_cases[case_index:]:
                    cls._record_failed_case(
                        db,
                        run=run,
                        case=pending_case,
                        failure_reason=quota_message,
                    )
                totals["failed"] += len(dataset_cases[case_index:])
                db.commit()
                cls._finalize_benchmark_run(
                    db,
                    run=run,
                    totals=totals,
                    total_cases=len(dataset_cases),
                    status=RunStatus.FAILED,
                    error_message=quota_message,
                )
                return
            except Exception as exc:
                cls._record_failed_case(
                    db,
                    run=run,
                    case=case,
                    failure_reason=str(exc),
                )
                totals["failed"] += 1
            db.commit()

        cls._finalize_benchmark_run(
            db,
            run=run,
            totals=totals,
            total_cases=len(dataset_cases),
            status=RunStatus.COMPLETED,
        )
