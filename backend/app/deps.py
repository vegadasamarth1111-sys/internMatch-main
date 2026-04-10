from typing import Annotated, Optional

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.core.security import decode_token
from app.models.user import User

security = HTTPBearer()
security_optional = HTTPBearer(auto_error=False)

DbSession = Annotated[Session, Depends(get_db)]


def get_current_user(
    credentials: Annotated[HTTPAuthorizationCredentials, Depends(security)],
    db: DbSession,
) -> User:
    """Require a valid JWT. Raises 401 if missing or invalid."""
    try:
        payload = decode_token(credentials.credentials)
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired access token",
        )

    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token payload",
        )

    user = db.query(User).filter(User.id == int(user_id)).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
        )

    return user


def get_current_user_optional(
    credentials: Annotated[
        Optional[HTTPAuthorizationCredentials], Depends(security_optional)
    ],
    db: DbSession,
) -> Optional[User]:
    """
    Like get_current_user but returns None instead of raising
    when no token is provided. Used for public endpoints that
    optionally enrich responses for logged-in users.
    """
    if not credentials:
        return None
    try:
        payload = decode_token(credentials.credentials)
        user_id = payload.get("sub")
        if not user_id:
            return None
        return db.query(User).filter(User.id == int(user_id)).first()
    except Exception:
        return None