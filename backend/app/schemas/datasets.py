from datetime import datetime

from pydantic import BaseModel, Field

from app.models.entities import CriterionType, Difficulty


class TaskTypeBreakdown(BaseModel):
    name: str
    count: int
    percent: int
    icon: str
    color: str


class DifficultyBreakdown(BaseModel):
    easy: int
    medium: int
    hard: int


class DatasetSummary(BaseModel):
    id: str
    name: str
    count: int
    tags: list[str]
    description: str
    difficulty: DifficultyBreakdown
    task_types: list[TaskTypeBreakdown]


class DatasetCaseResponse(BaseModel):
    id: int
    display_id: str
    prompt: str
    expected_behavior: str
    criterion_type: CriterionType
    difficulty: Difficulty
    tags: list[str]
    created_at: datetime

    model_config = {"from_attributes": True}


class DatasetDetail(DatasetSummary):
    cases: list[DatasetCaseResponse]


class DatasetCaseCreateRequest(BaseModel):
    prompt: str = Field(min_length=1)
    expected_behavior: str = Field(min_length=1)
    criterion_type: CriterionType
    difficulty: Difficulty
    tags: list[str] = Field(default_factory=list)
