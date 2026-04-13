from pydantic import BaseModel

from app.schemas.runs import RunSummary


class TrendPoint(BaseModel):
    name: str
    success: float
    latency: float


class FailureReasonSlice(BaseModel):
    label: str
    percent: int
    color: str


class DashboardOverview(BaseModel):
    total_runs: int
    total_runs_delta: float
    average_success_rate: float
    success_rate_delta: float
    average_latency_ms: float
    latency_delta_ms: float
    total_cost_usd: float
    cost_trend_label: str
    trend: list[TrendPoint]
    failure_reasons: list[FailureReasonSlice]
    recent_runs: list[RunSummary]
