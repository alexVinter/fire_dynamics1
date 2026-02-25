from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.deps.rbac import require_role
from app.models.user import User
from app.services.auth import hash_password

VALID_ROLES = ("admin", "manager", "warehouse")

router = APIRouter(
    prefix="/admin/users",
    tags=["admin-users"],
    dependencies=[Depends(require_role(["admin"]))],
)


class UserOut(BaseModel):
    id: int
    login: str
    role: str
    is_active: bool


class UserCreate(BaseModel):
    login: str = Field(min_length=1, max_length=255)
    password: str = Field(min_length=6, max_length=255)
    role: str = Field(default="manager")


class UserPatch(BaseModel):
    role: str | None = None
    is_active: bool | None = None


@router.get("", response_model=list[UserOut])
def list_users(db: Session = Depends(get_db)) -> list[UserOut]:
    users = db.execute(select(User).order_by(User.id)).scalars().all()
    return [UserOut(id=u.id, login=u.login, role=u.role, is_active=u.is_active) for u in users]


@router.post("", response_model=UserOut, status_code=status.HTTP_201_CREATED)
def create_user(body: UserCreate, db: Session = Depends(get_db)) -> UserOut:
    if body.role not in VALID_ROLES:
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_ENTITY,
            f"Invalid role. Allowed: {', '.join(VALID_ROLES)}",
        )

    exists = db.execute(select(User).where(User.login == body.login)).scalar_one_or_none()
    if exists is not None:
        raise HTTPException(status.HTTP_409_CONFLICT, "Login already taken")

    user = User(
        login=body.login,
        password_hash=hash_password(body.password),
        role=body.role,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return UserOut(id=user.id, login=user.login, role=user.role, is_active=user.is_active)


@router.patch("/{user_id}", response_model=UserOut)
def patch_user(user_id: int, body: UserPatch, db: Session = Depends(get_db)) -> UserOut:
    user = db.get(User, user_id)
    if user is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "User not found")

    if body.role is not None:
        if body.role not in VALID_ROLES:
            raise HTTPException(
                status.HTTP_422_UNPROCESSABLE_ENTITY,
                f"Invalid role. Allowed: {', '.join(VALID_ROLES)}",
            )
        user.role = body.role

    if body.is_active is not None:
        user.is_active = body.is_active

    db.commit()
    db.refresh(user)
    return UserOut(id=user.id, login=user.login, role=user.role, is_active=user.is_active)
