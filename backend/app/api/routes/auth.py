from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.config import get_settings
from app.core.security import create_access_token, get_password_hash, verify_password
from app.db.session import get_db
from app.models import InviteCode, User
from app.schemas.auth import LoginRequest, RegisterRequest, UserResponse
from app.services.agent_profiles import ensure_default_profile


router = APIRouter()


def _derive_full_name(email: str) -> str:
    local_part = email.split("@", 1)[0]
    return local_part.replace(".", " ").replace("_", " ").title()


def _set_session_cookie(response: Response, user_id: int) -> None:
    settings = get_settings()
    token = create_access_token(str(user_id))
    response.set_cookie(
        key=settings.session_cookie_name,
        value=token,
        httponly=True,
        samesite="lax",
        secure=False,
        max_age=settings.access_token_expire_minutes * 60,
    )


@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def register(payload: RegisterRequest, response: Response, db: Session = Depends(get_db)) -> UserResponse:
    existing = db.scalar(select(User).where(User.email == payload.email.lower()))
    if existing is not None:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already registered.")

    invite = None
    if payload.invite_code:
        invite = db.scalar(select(InviteCode).where(InviteCode.code == payload.invite_code))
        if invite is None or not invite.is_active or invite.used_count >= invite.max_uses:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invite code is invalid.")
        invite.used_count += 1

    user = User(
        email=payload.email.lower(),
        full_name=_derive_full_name(payload.email),
        hashed_password=get_password_hash(payload.password),
        team_name=invite.team_name if invite else None,
        invite_code_id=invite.id if invite else None,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    ensure_default_profile(db, user)
    _set_session_cookie(response, user.id)
    return UserResponse.model_validate(user)


@router.post("/login", response_model=UserResponse)
def login(payload: LoginRequest, response: Response, db: Session = Depends(get_db)) -> UserResponse:
    user = db.scalar(select(User).where(User.email == payload.email.lower()))
    if user is None or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password.")

    ensure_default_profile(db, user)
    _set_session_cookie(response, user.id)
    return UserResponse.model_validate(user)


@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)) -> UserResponse:
    return UserResponse.model_validate(current_user)


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
def logout(response: Response) -> Response:
    settings = get_settings()
    response.delete_cookie(settings.session_cookie_name)
    response.status_code = status.HTTP_204_NO_CONTENT
    return response
