from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field

from app.models.entities import CriterionType, RunKind, RunStatus, StepType


class RunCreateRequest(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    dataset_id: str
    model_name: str | None = Field(default=None, min_length=1, max_length=128)


class LabRunCreateRequest(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    user_prompt: str = Field(min_length=1)
    model_name: str = Field(min_length=1, max_length=128)
    temperature: float = Field(ge=0, le=2)
    system_prompt: str = Field(min_length=1)
    enabled_tools: dict[str, bool]


class RunSummary(BaseModel):
    id: str
    display_id: str
    name: str
    dataset_id: str | None
    dataset_name: str | None
    model_name: str
    status: RunStatus
    total_score: float | None
    success_rate: float | None
    total_cost_usd: float
    avg_latency_ms: float | None
    created_at: datetime
    run_kind: RunKind


class RunStepResponse(BaseModel):
    id: int
    step_index: int
    step_type: StepType
    title: str | None
    content: str
    tool_name: str | None
    tool_input: dict[str, Any] | None
    tool_output: dict[str, Any] | None
    latency_ms: int | None
    created_at: datetime

    model_config = {"from_attributes": True}


class CaseResultResponse(BaseModel):
    id: int
    dataset_case_id: int | None
    criterion_type: CriterionType
    output_text: str | None
    score: float | None
    passed: bool
    failure_reason: str | None
    latency_ms: int | None
    cost_usd: float
    prompt_tokens: int
    completion_tokens: int
    total_tokens: int
    model_name: str
    prompt_snapshot: str
    expected_behavior_snapshot: str

    model_config = {"from_attributes": True}


class RunDetail(BaseModel):
    id: str
    display_id: str
    name: str
    run_kind: RunKind
    dataset_id: str | None
    dataset_name: str | None
    model_name: str
    temperature: float
    system_prompt_snapshot: str
    user_prompt: str | None
    enabled_tools: dict[str, bool]
    status: RunStatus
    total_score: float | None
    success_rate: float | None
    avg_latency_ms: float | None
    total_cost_usd: float
    prompt_tokens: int
    completion_tokens: int
    total_tokens: int
    total_cases: int
    succeeded_cases: int
    failed_cases: int
    final_output: str | None
    error_message: str | None
    raw_response: dict[str, Any] | None
    created_at: datetime
    started_at: datetime | None
    completed_at: datetime | None
    steps: list[RunStepResponse]
    case_results: list[CaseResultResponse]


class RunStatusResponse(BaseModel):
    id: str
    status: RunStatus
