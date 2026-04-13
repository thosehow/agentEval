from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models import User
from app.schemas.agent import AgentProfileResponse, AgentProfileUpdateRequest
from app.services.agent_profiles import ensure_default_profile, get_active_profile


router = APIRouter()


@router.get("/profile/active", response_model=AgentProfileResponse)
def get_active_agent_profile(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> AgentProfileResponse:
    profile = ensure_default_profile(db, current_user)
    return AgentProfileResponse.model_validate(profile)


@router.put("/profile/active", response_model=AgentProfileResponse)
def update_active_agent_profile(
    payload: AgentProfileUpdateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> AgentProfileResponse:
    profile = get_active_profile(db, current_user)
    if profile is None:
        raise HTTPException(status_code=404, detail="Active agent profile not found.")

    profile.model_name = payload.model_name
    profile.temperature = payload.temperature
    profile.system_prompt = payload.system_prompt
    profile.enabled_tools = payload.enabled_tools
    db.commit()
    db.refresh(profile)
    return AgentProfileResponse.model_validate(profile)
