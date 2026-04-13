from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models import Dataset, EvaluationRun, RunKind, RunStatus, User
from app.schemas.runs import RunCreateRequest, RunDetail, RunStatusResponse, RunSummary
from app.services.agent_profiles import ensure_default_profile
from app.services.presenters import build_run_detail, build_run_summary
from app.services.run_executor import RunExecutor
from app.utils.ids import generate_run_display_id, generate_run_pk


router = APIRouter()


def _get_user_run(db: Session, run_id: str, user: User) -> EvaluationRun | None:
    return db.scalar(
        select(EvaluationRun)
        .where(EvaluationRun.id == run_id, EvaluationRun.user_id == user.id)
        .options(
            selectinload(EvaluationRun.dataset),
            selectinload(EvaluationRun.steps),
            selectinload(EvaluationRun.case_results),
        )
    )


@router.get("", response_model=list[RunSummary])
def list_runs(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[RunSummary]:
    runs = db.scalars(
        select(EvaluationRun)
        .where(EvaluationRun.user_id == current_user.id)
        .options(selectinload(EvaluationRun.dataset))
        .order_by(EvaluationRun.created_at.desc())
    ).all()
    return [build_run_summary(run) for run in runs]


@router.post("", response_model=RunSummary, status_code=status.HTTP_201_CREATED)
def create_benchmark_run(
    payload: RunCreateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> RunSummary:
    dataset = db.scalar(
        select(Dataset).where(Dataset.id == payload.dataset_id).options(selectinload(Dataset.cases))
    )
    if dataset is None:
        raise HTTPException(status_code=404, detail="Dataset not found.")

    profile = ensure_default_profile(db, current_user)
    run = EvaluationRun(
        id=generate_run_pk(),
        display_id=generate_run_display_id(),
        user_id=current_user.id,
        dataset_id=dataset.id,
        agent_profile_id=profile.id,
        run_kind=RunKind.BENCHMARK,
        name=payload.name,
        model_name=profile.model_name,
        temperature=profile.temperature,
        system_prompt_snapshot=profile.system_prompt,
        enabled_tools=profile.enabled_tools,
        status=RunStatus.QUEUED,
        total_cases=len(dataset.cases),
    )
    db.add(run)
    db.commit()
    db.refresh(run)
    run.dataset = dataset
    RunExecutor.launch(run.id)
    return build_run_summary(run)


@router.get("/{run_id}", response_model=RunDetail)
def get_run_detail(
    run_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> RunDetail:
    run = _get_user_run(db, run_id, current_user)
    if run is None:
        raise HTTPException(status_code=404, detail="Run not found.")
    return build_run_detail(run)


@router.post("/{run_id}/rerun", response_model=RunSummary, status_code=status.HTTP_201_CREATED)
def rerun(
    run_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> RunSummary:
    source = _get_user_run(db, run_id, current_user)
    if source is None:
        raise HTTPException(status_code=404, detail="Run not found.")

    run = EvaluationRun(
        id=generate_run_pk(),
        display_id=generate_run_display_id(),
        user_id=current_user.id,
        dataset_id=source.dataset_id,
        agent_profile_id=source.agent_profile_id,
        run_kind=source.run_kind,
        name=source.name,
        model_name=source.model_name,
        temperature=source.temperature,
        system_prompt_snapshot=source.system_prompt_snapshot,
        user_prompt=source.user_prompt,
        enabled_tools=source.enabled_tools,
        status=RunStatus.QUEUED,
        total_cases=source.total_cases,
    )
    db.add(run)
    db.commit()
    db.refresh(run)
    RunExecutor.launch(run.id)
    return build_run_summary(run)


@router.post("/{run_id}/cancel", response_model=RunStatusResponse)
def cancel_run(
    run_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> RunStatusResponse:
    run = _get_user_run(db, run_id, current_user)
    if run is None:
        raise HTTPException(status_code=404, detail="Run not found.")

    run.cancel_requested = True
    if run.status == RunStatus.QUEUED:
        run.status = RunStatus.CANCELLED
    db.commit()
    return RunStatusResponse(id=run.id, status=run.status)
