from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends
from fastapi.responses import JSONResponse
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models import CaseResult, EvaluationRun, User
from app.schemas.dashboard import DashboardOverview, TrendPoint
from app.services.presenters import build_failure_reason_slices, build_run_summary, empty_dashboard


router = APIRouter()


def _utc_now() -> datetime:
    return datetime.now(timezone.utc)


@router.get("/overview", response_model=DashboardOverview)
def get_dashboard_overview(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> DashboardOverview:
    runs = db.scalars(
        select(EvaluationRun)
        .where(EvaluationRun.user_id == current_user.id)
        .options(selectinload(EvaluationRun.dataset))
        .order_by(EvaluationRun.created_at.desc())
    ).all()
    if not runs:
        return empty_dashboard()

    now = _utc_now()
    recent_window = now - timedelta(days=7)
    previous_window = now - timedelta(days=14)

    recent_runs = [run for run in runs if run.created_at >= recent_window]
    previous_runs = [run for run in runs if previous_window <= run.created_at < recent_window]

    def _avg(values: list[float | None]) -> float:
        filtered = [value for value in values if value is not None]
        return round(sum(filtered) / len(filtered), 2) if filtered else 0.0

    total_runs_delta = round((len(recent_runs) - len(previous_runs)) * 100 / max(len(previous_runs), 1), 2)
    avg_success_recent = _avg([run.success_rate for run in recent_runs])
    avg_success_previous = _avg([run.success_rate for run in previous_runs])
    success_rate_delta = round(avg_success_recent - avg_success_previous, 2)
    avg_latency_recent = _avg([run.avg_latency_ms for run in recent_runs])
    avg_latency_previous = _avg([run.avg_latency_ms for run in previous_runs])
    latency_delta_ms = round(avg_latency_recent - avg_latency_previous, 2)

    recent_cost = sum(run.total_cost_usd for run in recent_runs)
    previous_cost = sum(run.total_cost_usd for run in previous_runs)
    if recent_cost > previous_cost:
        cost_label = "上升"
    elif recent_cost < previous_cost:
        cost_label = "下降"
    else:
        cost_label = "平稳"

    trend: list[TrendPoint] = []
    labels = ["周一", "周二", "周三", "周四", "周五", "周六", "周日"]
    for days_ago, label in zip(range(6, -1, -1), labels, strict=True):
        day = (now - timedelta(days=days_ago)).date()
        day_runs = [run for run in runs if run.created_at.date() == day]
        trend.append(
            TrendPoint(
                name=label,
                success=_avg([run.success_rate for run in day_runs]),
                latency=_avg([run.avg_latency_ms for run in day_runs]),
            )
        )

    run_ids = [run.id for run in runs]
    failed_case_results = db.scalars(
        select(CaseResult).where(CaseResult.run_id.in_(run_ids), CaseResult.passed.is_(False))
    ).all()

    return DashboardOverview(
        total_runs=len(runs),
        total_runs_delta=total_runs_delta,
        average_success_rate=_avg([run.success_rate for run in runs]),
        success_rate_delta=success_rate_delta,
        average_latency_ms=_avg([run.avg_latency_ms for run in runs]),
        latency_delta_ms=latency_delta_ms,
        total_cost_usd=round(sum(run.total_cost_usd for run in runs), 6),
        cost_trend_label=cost_label,
        trend=trend,
        failure_reasons=build_failure_reason_slices(failed_case_results),
        recent_runs=[build_run_summary(run) for run in runs[:5]],
    )


@router.get("/report")
def export_dashboard_report(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> JSONResponse:
    overview = get_dashboard_overview(db=db, current_user=current_user)
    return JSONResponse(
        {
            "generated_at": _utc_now().isoformat(),
            "overview": overview.model_dump(mode="json"),
        }
    )
