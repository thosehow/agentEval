from functools import lru_cache
from pathlib import Path

from pydantic import Field
from pydantic_settings import BaseSettings, PydanticBaseSettingsSource, SettingsConfigDict


ROOT_DIR = Path(__file__).resolve().parents[3]


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=ROOT_DIR / ".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    @classmethod
    def settings_customise_sources(
        cls,
        settings_cls: type[BaseSettings],
        init_settings: PydanticBaseSettingsSource,
        env_settings: PydanticBaseSettingsSource,
        dotenv_settings: PydanticBaseSettingsSource,
        file_secret_settings: PydanticBaseSettingsSource,
    ) -> tuple[PydanticBaseSettingsSource, ...]:
        # Prefer the repository's .env over ambient shell variables so local
        # dev commands don't accidentally bind to another Postgres instance.
        return (
            init_settings,
            dotenv_settings,
            env_settings,
            file_secret_settings,
        )

    app_name: str = "AgentEval"
    environment: str = "development"
    secret_key: str = Field(default="change-me-in-production", alias="APP_SECRET_KEY")
    access_token_expire_minutes: int = 60 * 24 * 7
    session_cookie_name: str = "agenteval_session"

    database_url: str = Field(
        default="postgresql+psycopg://agenteval_app:agenteval_app@localhost:55432/agenteval",
        alias="DATABASE_URL",
    )
    agent_database_url: str = Field(
        default="postgresql+psycopg://agenteval_agent:agenteval_agent@localhost:55432/agenteval",
        alias="AGENT_DATABASE_URL",
    )
    sqlalchemy_echo: bool = False

    gemini_api_key: str | None = Field(default=None, alias="GEMINI_API_KEY")
    gemini_model: str = Field(default="gemini-2.5-flash", alias="GEMINI_MODEL")
    gemini_judge_model: str = Field(default="gemini-2.5-flash", alias="GEMINI_JUDGE_MODEL")
    gemini_max_tool_rounds: int = 6

    tavily_api_key: str | None = Field(default=None, alias="TAVILY_API_KEY")
    tavily_search_url: str = "https://api.tavily.com/search"

    aws_access_key_id: str | None = Field(default=None, alias="AWS_ACCESS_KEY_ID")
    aws_secret_access_key: str | None = Field(default=None, alias="AWS_SECRET_ACCESS_KEY")
    aws_session_token: str | None = Field(default=None, alias="AWS_SESSION_TOKEN")
    aws_region: str | None = Field(default=None, alias="AWS_REGION")
    aws_s3_bucket: str | None = Field(default=None, alias="AWS_S3_BUCKET")

    frontend_dev_url: str = "http://localhost:3000"
    frontend_dist_dir: str = "dist"

    seed_invite_code: str = "INV-DEMO-2026"
    seed_team_name: str = "Founding Team"
    default_agent_profile_name: str = "Precision Architect"
    default_agent_profile_version: str = "v0.4.12"
    default_agent_temperature: float = 0.72
    default_agent_system_prompt: str = (
        "你是一个精确逻辑 Agent，旨在处理财务审计中的多步推理任务。"
        "你可以使用授权工具来查询数据库、读取 S3 内容、检查认证信息和搜索网页。"
        "回答时优先给出结构清晰、可验证的结论。"
    )

    postgres_tool_schema: str = "agent_tools"
    postgres_tool_max_rows: int = 50
    postgres_statement_timeout_ms: int = 5000

    @property
    def frontend_dist_path(self) -> Path:
        return ROOT_DIR / self.frontend_dist_dir

    @property
    def cors_origins(self) -> list[str]:
        return [self.frontend_dev_url]


@lru_cache
def get_settings() -> Settings:
    return Settings()
