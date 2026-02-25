from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.deps.auth import get_current_user
from app.models.user import User
from app.services.auth import create_access_token, verify_password

router = APIRouter(prefix="/auth", tags=["auth"])


class LoginRequest(BaseModel):
    login: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class UserMeResponse(BaseModel):
    id: int
    login: str
    role: str


@router.post("/login", response_model=TokenResponse)
def login(body: LoginRequest, db: Session = Depends(get_db)) -> TokenResponse:
    user = db.execute(
        select(User).where(User.login == body.login)
    ).scalar_one_or_none()

    if user is None or not verify_password(body.password, user.password_hash):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid login or password")

    if not user.is_active:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Account is disabled")

    token = create_access_token({"sub": str(user.id), "role": user.role})
    return TokenResponse(access_token=token)


@router.get("/me", response_model=UserMeResponse)
def me(current_user: User = Depends(get_current_user)) -> UserMeResponse:
    return UserMeResponse(
        id=current_user.id,
        login=current_user.login,
        role=current_user.role,
    )


@router.post("/logout", status_code=status.HTTP_200_OK)
def logout() -> dict:
    return {"detail": "ok"}
