from datetime import datetime

from pydantic import BaseModel, Field


class AgentProfileResponse(BaseModel):
    id: int
    name: str
    version: str
    model_name: str
    temperature: float
    system_prompt: str
    enabled_tools: dict[str, bool]
    active: bool
    updated_at: datetime

    model_config = {"from_attributes": True}


class AgentProfileUpdateRequest(BaseModel):
    model_name: str = Field(min_length=1, max_length=128)
    temperature: float = Field(ge=0, le=2)
    system_prompt: str = Field(min_length=1)
    enabled_tools: dict[str, bool]
