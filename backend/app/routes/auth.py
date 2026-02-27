from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.deps.auth import get_current_user
from app.models.user import User
from app.services.auth import create_access_token, hash_password, verify_password
from app.services.email_verify import create_verify_token, send_verify_email, verify_token

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


class RegisterRequest(BaseModel):
    login: str = Field(min_length=1, max_length=255)
    email: EmailStr
    password: str = Field(min_length=6, max_length=255)


class RegisterResponse(BaseModel):
    detail: str


@router.post("/register", response_model=RegisterResponse, status_code=status.HTTP_201_CREATED)
def register(body: RegisterRequest, db: Session = Depends(get_db)) -> RegisterResponse:
    if db.execute(select(User).where(User.login == body.login)).scalar_one_or_none():
        raise HTTPException(status.HTTP_409_CONFLICT, "Login already taken")
    if db.execute(select(User).where(User.email == body.email)).scalar_one_or_none():
        raise HTTPException(status.HTTP_409_CONFLICT, "Email already taken")

    user = User(
        login=body.login,
        email=body.email,
        password_hash=hash_password(body.password),
        role=None,
        is_active=True,
        email_verified=False,
    )
    db.add(user)
    db.flush()

    raw_token = create_verify_token(db, user.id)
    db.commit()

    send_verify_email(body.email, raw_token)
    return RegisterResponse(detail="verify_email_required")


@router.get("/verify-email")
def verify_email(token: str, db: Session = Depends(get_db)) -> dict:
    user = verify_token(db, token)
    if user is None:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Invalid or expired token")
    db.commit()
    return {"detail": "email_verified"}


@router.post("/login", response_model=TokenResponse)
def login(body: LoginRequest, db: Session = Depends(get_db)) -> TokenResponse:
    user = db.execute(
        select(User).where(User.login == body.login)
    ).scalar_one_or_none()

    if user is None or not verify_password(body.password, user.password_hash):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid login or password")

    if not user.is_active:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Account is disabled")

    if user.email is not None and not user.email_verified:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Email not verified")

    if user.role is None:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Роль не назначена. Обратитесь к администратору.")

    token = create_access_token({"sub": str(user.id), "role": user.role})
    return TokenResponse(access_token=token)


@router.get("/me", response_model=UserMeResponse)
def me(current_user: User = Depends(get_current_user)) -> UserMeResponse:
    return UserMeResponse(
        id=current_user.id,
        login=current_user.login,
        role=current_user.role,
    )


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str = Field(min_length=6, max_length=255)


@router.patch("/me")
def change_password(
    body: ChangePasswordRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    if not verify_password(body.current_password, current_user.password_hash):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Неверный текущий пароль")
    current_user.password_hash = hash_password(body.new_password)
    db.commit()
    return {"detail": "ok"}


@router.post("/logout", status_code=status.HTTP_200_OK)
def logout() -> dict:
    return {"detail": "ok"}
