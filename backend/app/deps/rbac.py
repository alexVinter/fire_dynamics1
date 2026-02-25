from collections.abc import Sequence
from typing import Callable

from fastapi import Depends, HTTPException, status

from app.deps.auth import get_current_user
from app.models.user import User


def require_role(allowed_roles: Sequence[str]) -> Callable[..., User]:
    def _check(current_user: User = Depends(get_current_user)) -> User:
        if current_user.role not in allowed_roles:
            raise HTTPException(
                status.HTTP_403_FORBIDDEN,
                f"Role '{current_user.role}' is not allowed. Required: {', '.join(allowed_roles)}",
            )
        return current_user

    return _check
