from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.user import User
from app.services.auth import decode_access_token

_bearer = HTTPBearer()


def get_current_user(
    creds: HTTPAuthorizationCredentials = Depends(_bearer),
    db: Session = Depends(get_db),
) -> User:
    payload = decode_access_token(creds.credentials)
    if payload is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid or expired token")

    user_id: int | None = payload.get("sub")
    if user_id is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid token payload")

    user = db.get(User, int(user_id))
    if user is None or not user.is_active:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "User not found or inactive")

    return user
