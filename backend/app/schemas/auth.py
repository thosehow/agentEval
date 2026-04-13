from datetime import datetime

from pydantic import AliasChoices, BaseModel, ConfigDict, EmailStr, Field, field_validator, model_validator


class RegisterRequest(BaseModel):
    model_config = ConfigDict(populate_by_name=True, str_strip_whitespace=True)

    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    confirm_password: str = Field(
        min_length=8,
        max_length=128,
        validation_alias=AliasChoices("confirm_password", "confirmPassword"),
    )
    invite_code: str | None = Field(
        default=None,
        max_length=64,
        validation_alias=AliasChoices("invite_code", "inviteCode"),
    )

    @field_validator("invite_code", mode="before")
    @classmethod
    def empty_invite_code_to_none(cls, value: str | None) -> str | None:
        if value is None:
            return None
        normalized = value.strip()
        return normalized or None

    @model_validator(mode="after")
    def passwords_match(self) -> "RegisterRequest":
        if self.password != self.confirm_password:
            raise ValueError("Passwords do not match.")
        return self


class LoginRequest(BaseModel):
    model_config = ConfigDict(populate_by_name=True, str_strip_whitespace=True)

    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    remember_me: bool = Field(default=False, validation_alias=AliasChoices("remember_me", "rememberMe"))


class UserResponse(BaseModel):
    id: int
    email: EmailStr
    full_name: str
    team_name: str | None
    created_at: datetime

    model_config = {"from_attributes": True}
