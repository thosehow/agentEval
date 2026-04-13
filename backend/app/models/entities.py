import enum
from datetime import datetime
from typing import Any

from sqlalchemy import (
    JSON,
    Boolean,
    DateTime,
    Enum,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, utcnow


class Difficulty(str, enum.Enum):
    EASY = "easy"
    MEDIUM = "medium"
    HARD = "hard"


class CriterionType(str, enum.Enum):
    ACCURACY_THRESHOLD = "accuracy_threshold"
    STRICT_JSON_MATCH = "strict_json_match"
    RETRY_PROTOCOL_CHECK = "retry_protocol_check"


class RunKind(str, enum.Enum):
    LAB = "lab"
    BENCHMARK = "benchmark"


class RunStatus(str, enum.Enum):
    QUEUED = "queued"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"


class StepType(str, enum.Enum):
    THOUGHT = "thought"
    ACTION = "action"
    TOOL_RESULT = "tool_result"
    FINAL = "final"
    JUDGE = "judge"
    ERROR = "error"


class InviteCode(TimestampMixin, Base):
    __tablename__ = "invite_codes"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    code: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    team_name: Mapped[str] = mapped_column(String(128))
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    max_uses: Mapped[int] = mapped_column(Integer, default=1000)
    used_count: Mapped[int] = mapped_column(Integer, default=0)

    users: Mapped[list["User"]] = relationship(back_populates="invite_code")


class User(TimestampMixin, Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    full_name: Mapped[str] = mapped_column(String(255))
    hashed_password: Mapped[str] = mapped_column(String(255))
    team_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    invite_code_id: Mapped[int | None] = mapped_column(ForeignKey("invite_codes.id"), nullable=True)

    invite_code: Mapped[InviteCode | None] = relationship(back_populates="users")
    agent_profiles: Mapped[list["AgentProfile"]] = relationship(back_populates="user")
    runs: Mapped[list["EvaluationRun"]] = relationship(back_populates="user")


class AgentProfile(TimestampMixin, Base):
    __tablename__ = "agent_profiles"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    name: Mapped[str] = mapped_column(String(255))
    version: Mapped[str] = mapped_column(String(64))
    model_name: Mapped[str] = mapped_column(String(128))
    temperature: Mapped[float] = mapped_column(Float, default=0.72)
    system_prompt: Mapped[str] = mapped_column(Text)
    enabled_tools: Mapped[dict[str, bool]] = mapped_column(JSON, default=dict)
    active: Mapped[bool] = mapped_column(Boolean, default=False)

    user: Mapped[User] = relationship(back_populates="agent_profiles")
    runs: Mapped[list["EvaluationRun"]] = relationship(back_populates="agent_profile")


class Dataset(TimestampMixin, Base):
    __tablename__ = "datasets"

    id: Mapped[str] = mapped_column(String(128), primary_key=True)
    name: Mapped[str] = mapped_column(String(255))
    description: Mapped[str] = mapped_column(Text)
    tags: Mapped[list[str]] = mapped_column(JSON, default=list)
    created_by_user_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    active: Mapped[bool] = mapped_column(Boolean, default=True)

    cases: Mapped[list["DatasetCase"]] = relationship(back_populates="dataset", cascade="all, delete-orphan")
    runs: Mapped[list["EvaluationRun"]] = relationship(back_populates="dataset")


class DatasetCase(TimestampMixin, Base):
    __tablename__ = "dataset_cases"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    display_id: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    dataset_id: Mapped[str] = mapped_column(ForeignKey("datasets.id"), index=True)
    prompt: Mapped[str] = mapped_column(Text)
    expected_behavior: Mapped[str] = mapped_column(Text)
    criterion_type: Mapped[CriterionType] = mapped_column(
        Enum(CriterionType, native_enum=False),
        default=CriterionType.ACCURACY_THRESHOLD,
    )
    difficulty: Mapped[Difficulty] = mapped_column(
        Enum(Difficulty, native_enum=False),
        default=Difficulty.MEDIUM,
    )
    tags: Mapped[list[str]] = mapped_column(JSON, default=list)

    dataset: Mapped[Dataset] = relationship(back_populates="cases")
    case_results: Mapped[list["CaseResult"]] = relationship(back_populates="dataset_case")


class EvaluationRun(TimestampMixin, Base):
    __tablename__ = "evaluation_runs"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    display_id: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    dataset_id: Mapped[str | None] = mapped_column(ForeignKey("datasets.id"), nullable=True)
    agent_profile_id: Mapped[int | None] = mapped_column(ForeignKey("agent_profiles.id"), nullable=True)
    run_kind: Mapped[RunKind] = mapped_column(Enum(RunKind, native_enum=False), index=True)
    name: Mapped[str] = mapped_column(String(255))
    model_name: Mapped[str] = mapped_column(String(128))
    temperature: Mapped[float] = mapped_column(Float, default=0.72)
    system_prompt_snapshot: Mapped[str] = mapped_column(Text)
    user_prompt: Mapped[str | None] = mapped_column(Text, nullable=True)
    enabled_tools: Mapped[dict[str, bool]] = mapped_column(JSON, default=dict)
    status: Mapped[RunStatus] = mapped_column(
        Enum(RunStatus, native_enum=False),
        default=RunStatus.QUEUED,
        index=True,
    )
    cancel_requested: Mapped[bool] = mapped_column(Boolean, default=False)
    started_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    total_score: Mapped[float | None] = mapped_column(Float, nullable=True)
    success_rate: Mapped[float | None] = mapped_column(Float, nullable=True)
    avg_latency_ms: Mapped[float | None] = mapped_column(Float, nullable=True)
    total_cost_usd: Mapped[float] = mapped_column(Float, default=0.0)
    prompt_tokens: Mapped[int] = mapped_column(Integer, default=0)
    completion_tokens: Mapped[int] = mapped_column(Integer, default=0)
    total_tokens: Mapped[int] = mapped_column(Integer, default=0)
    total_cases: Mapped[int] = mapped_column(Integer, default=0)
    succeeded_cases: Mapped[int] = mapped_column(Integer, default=0)
    failed_cases: Mapped[int] = mapped_column(Integer, default=0)
    final_output: Mapped[str | None] = mapped_column(Text, nullable=True)
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)
    raw_response: Mapped[dict[str, Any] | None] = mapped_column(JSON, nullable=True)

    user: Mapped[User] = relationship(back_populates="runs")
    dataset: Mapped[Dataset | None] = relationship(back_populates="runs")
    agent_profile: Mapped[AgentProfile | None] = relationship(back_populates="runs")
    steps: Mapped[list["RunStep"]] = relationship(back_populates="run", cascade="all, delete-orphan")
    case_results: Mapped[list["CaseResult"]] = relationship(back_populates="run", cascade="all, delete-orphan")


class RunStep(Base):
    __tablename__ = "run_steps"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    run_id: Mapped[str] = mapped_column(ForeignKey("evaluation_runs.id"), index=True)
    case_result_id: Mapped[int | None] = mapped_column(ForeignKey("case_results.id"), nullable=True)
    step_index: Mapped[int] = mapped_column(Integer)
    step_type: Mapped[StepType] = mapped_column(Enum(StepType, native_enum=False), index=True)
    title: Mapped[str | None] = mapped_column(String(255), nullable=True)
    content: Mapped[str] = mapped_column(Text)
    tool_name: Mapped[str | None] = mapped_column(String(128), nullable=True)
    tool_input: Mapped[dict[str, Any] | None] = mapped_column(JSON, nullable=True)
    tool_output: Mapped[dict[str, Any] | None] = mapped_column(JSON, nullable=True)
    latency_ms: Mapped[int | None] = mapped_column(Integer, nullable=True)
    raw_payload: Mapped[dict[str, Any] | None] = mapped_column(JSON, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    run: Mapped[EvaluationRun] = relationship(back_populates="steps")
    case_result: Mapped["CaseResult | None"] = relationship(back_populates="steps")


class CaseResult(Base):
    __tablename__ = "case_results"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    run_id: Mapped[str] = mapped_column(ForeignKey("evaluation_runs.id"), index=True)
    dataset_case_id: Mapped[int | None] = mapped_column(ForeignKey("dataset_cases.id"), nullable=True)
    prompt_snapshot: Mapped[str] = mapped_column(Text)
    expected_behavior_snapshot: Mapped[str] = mapped_column(Text)
    criterion_type: Mapped[CriterionType] = mapped_column(Enum(CriterionType, native_enum=False))
    output_text: Mapped[str | None] = mapped_column(Text, nullable=True)
    score: Mapped[float | None] = mapped_column(Float, nullable=True)
    passed: Mapped[bool] = mapped_column(Boolean, default=False)
    failure_reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    latency_ms: Mapped[int | None] = mapped_column(Integer, nullable=True)
    cost_usd: Mapped[float] = mapped_column(Float, default=0.0)
    prompt_tokens: Mapped[int] = mapped_column(Integer, default=0)
    completion_tokens: Mapped[int] = mapped_column(Integer, default=0)
    total_tokens: Mapped[int] = mapped_column(Integer, default=0)
    model_name: Mapped[str] = mapped_column(String(128))
    raw_response: Mapped[dict[str, Any] | None] = mapped_column(JSON, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    run: Mapped[EvaluationRun] = relationship(back_populates="case_results")
    dataset_case: Mapped[DatasetCase | None] = relationship(back_populates="case_results")
    steps: Mapped[list[RunStep]] = relationship(back_populates="case_result")
