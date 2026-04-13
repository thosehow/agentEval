from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models import EvaluationRun, RunKind, RunStatus, User
from app.schemas.runs import LabRunCreateRequest, RunDetail, RunSummary
from app.services.presenters import build_run_detail, build_run_summary
from app.services.run_executor import RunExecutor
from app.utils.ids import generate_run_display_id, generate_run_pk


router = APIRouter()


@router.post("/runs", response_model=RunSummary, status_code=status.HTTP_201_CREATED)
def create_lab_run(
    payload: LabRunCreateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> RunSummary:
    run = EvaluationRun(
        id=generate_run_pk(),
        display_id=generate_run_display_id(),
        user_id=current_user.id,
        dataset_id=None,
        agent_profile_id=None,
        run_kind=RunKind.LAB,
        name=payload.name,
        model_name=payload.model_name,
        temperature=payload.temperature,
        system_prompt_snapshot=payload.system_prompt,
        user_prompt=payload.user_prompt,
        enabled_tools=payload.enabled_tools,
        status=RunStatus.QUEUED,
        total_cases=1,
    )
    db.add(run)
    db.commit()
    db.refresh(run)
    RunExecutor.launch(run.id)
    return build_run_summary(run)


@router.get("/runs/{run_id}", response_model=RunDetail)
def get_lab_run(
    run_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> RunDetail:
    from app.api.routes.runs import _get_user_run

    run = _get_user_run(db, run_id, current_user)
    if run is None:
        raise HTTPException(status_code=404, detail="Run not found.")
    return build_run_detail(run)
