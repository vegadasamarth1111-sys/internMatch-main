from datetime import datetime, UTC
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session
from sqlalchemy.sql import func
from pydantic import BaseModel, Field

from app.database.session import get_db
from app.deps import get_current_user
from app.models.user import User
from app.core.security import hash_password, verify_password
from app.core.limiter import limiter

router = APIRouter(prefix="/users", tags=["Users"])

DbSession = Annotated[Session, Depends(get_db)]
CurrentUser = Annotated[User, Depends(get_current_user)]


class ChangePasswordRequest(BaseModel):
    current_password: str = Field(min_length=1, max_length=128)
    new_password: str = Field(min_length=8, max_length=128)


@router.get("/me", summary="Get current user")
def get_me(current_user: CurrentUser) -> dict:
    return {
        "id": current_user.id,
        "email": current_user.email,
        "role": current_user.role,
    }


@router.post(
    "/me/change-password",
    status_code=status.HTTP_200_OK,
    summary="Change password (requires current password)",
)
@limiter.limit("5/minute")
def change_password(
    request: Request,
    data: ChangePasswordRequest,
    db: DbSession,
    current_user: CurrentUser,
):
    if not verify_password(data.current_password, current_user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password is incorrect.",
        )

    if data.current_password == data.new_password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="New password must differ from the current password.",
        )

    current_user.password_hash = hash_password(data.new_password)
    current_user.updated_at = func.now()
    db.commit()

    return {"message": "Password changed successfully."}


@router.delete(
    "/me",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete own account (soft delete)",
)
def delete_me(
    db: DbSession,
    current_user: CurrentUser,
):
    current_user.is_deleted = True
    current_user.deleted_at = datetime.now(UTC)
    current_user.updated_at = func.now()
    db.commit()