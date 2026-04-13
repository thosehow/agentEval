from collections import Counter

from app.models import CaseResult, Dataset, DatasetCase, Difficulty, EvaluationRun
from app.schemas.dashboard import DashboardOverview, FailureReasonSlice, TrendPoint
from app.schemas.datasets import DatasetCaseResponse, DatasetDetail, DatasetSummary, DifficultyBreakdown, TaskTypeBreakdown
from app.schemas.runs import CaseResultResponse, RunDetail, RunStepResponse, RunSummary


TASK_TYPE_STYLE = {
    "工具化": ("API", "primary"),
    "逻辑推理": ("LOG", "tertiary"),
    "长文本": ("TXT", "secondary"),
    "SQL": ("SQL", "primary"),
    "财务": ("FIN", "secondary"),
    "格式": ("JSON", "tertiary"),
}


def _difficulty_breakdown(cases: list[DatasetCase]) -> DifficultyBreakdown:
    total = len(cases) or 1
    counter = Counter(case.difficulty.value for case in cases)
    return DifficultyBreakdown(
        easy=round(counter[Difficulty.EASY.value] * 100 / total),
        medium=round(counter[Difficulty.MEDIUM.value] * 100 / total),
        hard=round(counter[Difficulty.HARD.value] * 100 / total),
    )


def _task_types(cases: list[DatasetCase]) -> list[TaskTypeBreakdown]:
    tag_counter = Counter(tag for case in cases for tag in case.tags)
    total = sum(tag_counter.values()) or 1
    breakdown: list[TaskTypeBreakdown] = []
    for tag, count in tag_counter.most_common(3):
        icon, color = TASK_TYPE_STYLE.get(tag, ("TAG", "primary"))
        breakdown.append(
            TaskTypeBreakdown(
                name=tag,
                count=count,
                percent=round(count * 100 / total),
                icon=icon,
                color=color,
            )
        )
    return breakdown


def build_dataset_summary(dataset: Dataset) -> DatasetSummary:
    cases = sorted(dataset.cases, key=lambda case: case.id)
    return DatasetSummary(
        id=dataset.id,
        name=dataset.name,
        count=len(cases),
        tags=dataset.tags,
        description=dataset.description,
        difficulty=_difficulty_breakdown(cases),
        task_types=_task_types(cases),
    )


def build_dataset_detail(dataset: Dataset) -> DatasetDetail:
    summary = build_dataset_summary(dataset)
    return DatasetDetail(
        **summary.model_dump(),
        cases=[DatasetCaseResponse.model_validate(case) for case in sorted(dataset.cases, key=lambda item: item.id)],
    )


def build_run_summary(run: EvaluationRun) -> RunSummary:
    return RunSummary(
        id=run.id,
        display_id=run.display_id,
        name=run.name,
        dataset_id=run.dataset_id,
        dataset_name=run.dataset.name if run.dataset else None,
        model_name=run.model_name,
        status=run.status,
        total_score=run.total_score,
        success_rate=run.success_rate,
        total_cost_usd=run.total_cost_usd,
        avg_latency_ms=run.avg_latency_ms,
        created_at=run.created_at,
        run_kind=run.run_kind,
    )


def build_run_detail(run: EvaluationRun) -> RunDetail:
    return RunDetail(
        id=run.id,
        display_id=run.display_id,
        name=run.name,
        run_kind=run.run_kind,
        dataset_id=run.dataset_id,
        dataset_name=run.dataset.name if run.dataset else None,
        model_name=run.model_name,
        temperature=run.temperature,
        system_prompt_snapshot=run.system_prompt_snapshot,
        user_prompt=run.user_prompt,
        enabled_tools=run.enabled_tools,
        status=run.status,
        total_score=run.total_score,
        success_rate=run.success_rate,
        avg_latency_ms=run.avg_latency_ms,
        total_cost_usd=run.total_cost_usd,
        prompt_tokens=run.prompt_tokens,
        completion_tokens=run.completion_tokens,
        total_tokens=run.total_tokens,
        total_cases=run.total_cases,
        succeeded_cases=run.succeeded_cases,
        failed_cases=run.failed_cases,
        final_output=run.final_output,
        error_message=run.error_message,
        raw_response=run.raw_response,
        created_at=run.created_at,
        started_at=run.started_at,
        completed_at=run.completed_at,
        steps=[RunStepResponse.model_validate(step) for step in sorted(run.steps, key=lambda item: item.step_index)],
        case_results=[CaseResultResponse.model_validate(item) for item in sorted(run.case_results, key=lambda entry: entry.id)],
    )


def classify_failure_reason(reason: str | None) -> str:
    if not reason:
        return "幻觉问题"
    normalized = reason.lower()
    if any(keyword in normalized for keyword in ["sql", "postgres", "tool", "auth", "s3", "search"]):
        return "工具调用错误"
    if any(keyword in normalized for keyword in ["timeout", "timed out"]):
        return "请求超时"
    if any(keyword in normalized for keyword in ["json", "format", "格式"]):
        return "格式错误"
    return "幻觉问题"


def build_failure_reason_slices(results: list[CaseResult]) -> list[FailureReasonSlice]:
    if not results:
        return [
            FailureReasonSlice(label="工具调用错误", percent=0, color="primary"),
            FailureReasonSlice(label="幻觉问题", percent=0, color="secondary"),
            FailureReasonSlice(label="格式错误", percent=0, color="tertiary"),
            FailureReasonSlice(label="请求超时", percent=0, color="error"),
        ]

    counter = Counter(classify_failure_reason(item.failure_reason) for item in results if not item.passed)
    total = sum(counter.values()) or 1
    color_map = {
        "工具调用错误": "primary",
        "幻觉问题": "secondary",
        "格式错误": "tertiary",
        "请求超时": "error",
    }
    labels = ["工具调用错误", "幻觉问题", "格式错误", "请求超时"]
    return [
        FailureReasonSlice(
            label=label,
            percent=round(counter[label] * 100 / total) if total else 0,
            color=color_map[label],
        )
        for label in labels
    ]


def empty_dashboard() -> DashboardOverview:
    return DashboardOverview(
        total_runs=0,
        total_runs_delta=0,
        average_success_rate=0,
        success_rate_delta=0,
        average_latency_ms=0,
        latency_delta_ms=0,
        total_cost_usd=0,
        cost_trend_label="平稳",
        trend=[TrendPoint(name=label, success=0, latency=0) for label in ["周一", "周二", "周三", "周四", "周五", "周六", "周日"]],
        failure_reasons=build_failure_reason_slices([]),
        recent_runs=[],
    )
