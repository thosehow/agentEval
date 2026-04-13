from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.models import AgentProfile, User


DEFAULT_TOOL_STATE = {
    "postgres_hook": True,
    "aws_s3_bucket": False,
    "auth_service": True,
    "web_search_api": True,
}


def get_active_profile(db: Session, user: User) -> AgentProfile | None:
    return db.scalar(
        select(AgentProfile).where(
            AgentProfile.user_id == user.id,
            AgentProfile.active.is_(True),
        )
    )


def ensure_default_profile(db: Session, user: User) -> AgentProfile:
    existing = get_active_profile(db, user)
    if existing:
        return existing

    settings = get_settings()
    profile = AgentProfile(
        user_id=user.id,
        name=settings.default_agent_profile_name,
        version=settings.default_agent_profile_version,
        model_name=settings.gemini_model,
        temperature=settings.default_agent_temperature,
        system_prompt=settings.default_agent_system_prompt,
        enabled_tools=DEFAULT_TOOL_STATE.copy(),
        active=True,
    )
    db.add(profile)
    db.commit()
    db.refresh(profile)
    return profile
