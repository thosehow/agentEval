import re
import time
from typing import Any

import boto3
import httpx
from sqlalchemy import text
from sqlalchemy.engine import Engine
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.db.session import get_agent_engine
from app.models import InviteCode, User
from app.utils.serialization import to_plain_data


READ_ONLY_SQL_PATTERN = re.compile(r"^\s*(select|with)\b", re.IGNORECASE)
FORBIDDEN_SQL_KEYWORDS = (
    "insert",
    "update",
    "delete",
    "drop",
    "alter",
    "truncate",
    "grant",
    "revoke",
    "create",
    "comment",
    "copy",
)


class ToolExecutionError(RuntimeError):
    pass


def prepare_tool_schema(engine: Engine) -> None:
    if engine.dialect.name != "postgresql":
        return

    settings = get_settings()
    statements = [
        f"CREATE SCHEMA IF NOT EXISTS {settings.postgres_tool_schema};",
        f"""
        CREATE OR REPLACE VIEW {settings.postgres_tool_schema}.user_directory AS
        SELECT id, email, full_name, team_name, created_at
        FROM users;
        """,
        f"""
        CREATE OR REPLACE VIEW {settings.postgres_tool_schema}.dataset_catalog AS
        SELECT id, name, description, tags, active, created_at
        FROM datasets;
        """,
        f"""
        CREATE OR REPLACE VIEW {settings.postgres_tool_schema}.case_catalog AS
        SELECT display_id, dataset_id, prompt, expected_behavior, criterion_type, difficulty, tags, created_at
        FROM dataset_cases;
        """,
        f"""
        CREATE OR REPLACE VIEW {settings.postgres_tool_schema}.run_catalog AS
        SELECT display_id, run_kind, status, total_score, success_rate, total_cost_usd, created_at, user_id, dataset_id
        FROM evaluation_runs;
        """,
        f"GRANT USAGE ON SCHEMA {settings.postgres_tool_schema} TO agenteval_agent;",
        f"GRANT SELECT ON ALL TABLES IN SCHEMA {settings.postgres_tool_schema} TO agenteval_agent;",
    ]

    with engine.begin() as connection:
        for statement in statements:
            connection.execute(text(statement))


class ToolExecutor:
    def __init__(self, db: Session, current_user: User):
        self.db = db
        self.current_user = current_user
        self.settings = get_settings()
        self.agent_engine = get_agent_engine()

    def get_function_declarations(self, enabled_tools: dict[str, bool]) -> list[dict[str, Any]]:
        declarations: list[dict[str, Any]] = []
        if enabled_tools.get("postgres_hook"):
            declarations.append(
                {
                    "name": "postgres_query",
                    "description": "Execute a read-only SQL query against the agent_tools schema in PostgreSQL.",
                    "parameters": {
                        "type": "OBJECT",
                        "properties": {
                            "sql": {"type": "STRING", "description": "A read-only SQL SELECT query."},
                        },
                        "required": ["sql"],
                    },
                }
            )
        if enabled_tools.get("aws_s3_bucket"):
            declarations.extend(
                [
                    {
                        "name": "s3_list_objects",
                        "description": "List objects from the configured AWS S3 bucket.",
                        "parameters": {
                            "type": "OBJECT",
                            "properties": {
                                "prefix": {"type": "STRING"},
                                "max_keys": {"type": "NUMBER"},
                            },
                        },
                    },
                    {
                        "name": "s3_read_object",
                        "description": "Read a UTF-8 text object from the configured AWS S3 bucket.",
                        "parameters": {
                            "type": "OBJECT",
                            "properties": {
                                "key": {"type": "STRING"},
                                "max_chars": {"type": "NUMBER"},
                            },
                            "required": ["key"],
                        },
                    },
                ]
            )
        if enabled_tools.get("auth_service"):
            declarations.extend(
                [
                    {
                        "name": "auth_get_current_user",
                        "description": "Return the current authenticated user profile.",
                        "parameters": {"type": "OBJECT", "properties": {}},
                    },
                    {
                        "name": "auth_validate_invite_code",
                        "description": "Validate an invite code and return whether it can be used.",
                        "parameters": {
                            "type": "OBJECT",
                            "properties": {"code": {"type": "STRING"}},
                            "required": ["code"],
                        },
                    },
                ]
            )
        if enabled_tools.get("web_search_api"):
            declarations.append(
                {
                    "name": "web_search",
                    "description": "Search the web for current information and return a concise result set.",
                    "parameters": {
                        "type": "OBJECT",
                        "properties": {
                            "query": {"type": "STRING"},
                            "max_results": {"type": "NUMBER"},
                        },
                        "required": ["query"],
                    },
                }
            )
        return declarations

    def execute(self, name: str, arguments: dict[str, Any]) -> dict[str, Any]:
        dispatch = {
            "postgres_query": self.postgres_query,
            "s3_list_objects": self.s3_list_objects,
            "s3_read_object": self.s3_read_object,
            "auth_get_current_user": self.auth_get_current_user,
            "auth_validate_invite_code": self.auth_validate_invite_code,
            "web_search": self.web_search,
        }
        if name not in dispatch:
            raise ToolExecutionError(f"Unsupported tool: {name}")
        return dispatch[name](**arguments)

    def postgres_query(self, sql: str) -> dict[str, Any]:
        normalized = sql.strip()
        if not READ_ONLY_SQL_PATTERN.search(normalized):
            raise ToolExecutionError("Only read-only SELECT or WITH queries are allowed.")
        if any(keyword in normalized.lower() for keyword in FORBIDDEN_SQL_KEYWORDS):
            raise ToolExecutionError("Write-oriented SQL statements are not allowed.")
        if f"{self.settings.postgres_tool_schema}." not in normalized.lower():
            raise ToolExecutionError(
                f"Queries must target the read-only {self.settings.postgres_tool_schema} schema."
            )

        start = time.perf_counter()
        with self.agent_engine.connect() as connection:
            if self.agent_engine.dialect.name == "postgresql":
                timeout = self.settings.postgres_statement_timeout_ms
                connection.execute(text(f"SET statement_timeout = {timeout}"))
            result = connection.execute(text(normalized))
            rows = result.mappings().fetchmany(self.settings.postgres_tool_max_rows + 1)

        truncated = len(rows) > self.settings.postgres_tool_max_rows
        rows = rows[: self.settings.postgres_tool_max_rows]
        elapsed = round((time.perf_counter() - start) * 1000)
        return {
            "columns": list(rows[0].keys()) if rows else [],
            "rows": [to_plain_data(dict(row)) for row in rows],
            "truncated": truncated,
            "row_count": len(rows),
            "latency_ms": elapsed,
        }

    def _s3_client(self):
        if not (
            self.settings.aws_access_key_id
            and self.settings.aws_secret_access_key
            and self.settings.aws_region
            and self.settings.aws_s3_bucket
        ):
            raise ToolExecutionError("AWS S3 credentials or bucket are not configured.")
        return boto3.client(
            "s3",
            region_name=self.settings.aws_region,
            aws_access_key_id=self.settings.aws_access_key_id,
            aws_secret_access_key=self.settings.aws_secret_access_key,
            aws_session_token=self.settings.aws_session_token,
        )

    def s3_list_objects(self, prefix: str = "", max_keys: int = 10) -> dict[str, Any]:
        client = self._s3_client()
        response = client.list_objects_v2(
            Bucket=self.settings.aws_s3_bucket,
            Prefix=prefix,
            MaxKeys=min(max_keys or 10, 20),
        )
        contents = response.get("Contents", [])
        return {
            "bucket": self.settings.aws_s3_bucket,
            "count": len(contents),
            "objects": [
                {
                    "key": item["Key"],
                    "size": item["Size"],
                    "last_modified": item["LastModified"].isoformat(),
                }
                for item in contents
            ],
        }

    def s3_read_object(self, key: str, max_chars: int = 4000) -> dict[str, Any]:
        client = self._s3_client()
        response = client.get_object(Bucket=self.settings.aws_s3_bucket, Key=key)
        raw = response["Body"].read(max_chars * 4).decode("utf-8", errors="replace")
        return {
            "bucket": self.settings.aws_s3_bucket,
            "key": key,
            "content": raw[:max_chars],
            "truncated": len(raw) > max_chars,
        }

    def auth_get_current_user(self) -> dict[str, Any]:
        return {
            "id": self.current_user.id,
            "email": self.current_user.email,
            "full_name": self.current_user.full_name,
            "team_name": self.current_user.team_name,
        }

    def auth_validate_invite_code(self, code: str) -> dict[str, Any]:
        invite = self.db.query(InviteCode).filter(InviteCode.code == code).one_or_none()
        return {
            "code": code,
            "valid": bool(invite and invite.is_active and invite.used_count < invite.max_uses),
            "team_name": invite.team_name if invite else None,
            "remaining_uses": (invite.max_uses - invite.used_count) if invite else 0,
        }

    def web_search(self, query: str, max_results: int = 5) -> dict[str, Any]:
        if not self.settings.tavily_api_key:
            raise ToolExecutionError("Tavily API key is not configured.")

        payload = {
            "api_key": self.settings.tavily_api_key,
            "query": query,
            "max_results": min(max_results or 5, 8),
            "include_answer": False,
        }
        with httpx.Client(timeout=20.0) as client:
            response = client.post(self.settings.tavily_search_url, json=payload)
            response.raise_for_status()
            data = response.json()

        return {
            "query": query,
            "results": [
                {
                    "title": item.get("title"),
                    "url": item.get("url"),
                    "content": item.get("content"),
                }
                for item in data.get("results", [])
            ],
        }
