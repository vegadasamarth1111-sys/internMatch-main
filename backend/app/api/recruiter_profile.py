from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy.sql import func

from app.database.session import get_db
from app.deps import get_current_user
from app.models.user import User, Role
from app.models.recruiter_profile import RecruiterProfile
from app.schemas.recruiter_profile import (
    RecruiterProfileUpdate,
    RecruiterProfileResponse,
)
from app.utils.profile_completion import calculate_profile_completion

router = APIRouter(
    prefix="/recruiter/profile",
    tags=["Recruiter Profile"],
)

DbSession = Annotated[Session, Depends(get_db)]
CurrentUser = Annotated[User, Depends(get_current_user)]


@router.get(
    "",
    response_model=RecruiterProfileResponse,
    summary="Get recruiter profile",
)
def get_profile(
    db: DbSession,
    current_user: CurrentUser,
):
    if current_user.role != Role.recruiter:
        raise HTTPException(status_code=403, detail="Only recruiters allowed")

    profile = (
        db.query(RecruiterProfile)
        .filter(
            RecruiterProfile.user_id == current_user.id,
            RecruiterProfile.is_deleted.is_(False),
        )
        .first()
    )

    if not profile:
        raise HTTPException(status_code=404, detail="Recruiter profile not found")

    return profile


@router.put(
    "",
    response_model=RecruiterProfileResponse,
    summary="Update recruiter profile",
)
def update_profile(
    data: RecruiterProfileUpdate,
    db: DbSession,
    current_user: CurrentUser,
):
    if current_user.role != Role.recruiter:
        raise HTTPException(status_code=403, detail="Only recruiters allowed")

    profile = (
        db.query(RecruiterProfile)
        .filter(
            RecruiterProfile.user_id == current_user.id,
            RecruiterProfile.is_deleted.is_(False),
        )
        .first()
    )

    if not profile:
        raise HTTPException(status_code=404, detail="Recruiter profile not found")

    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(profile, field, value)

    percentage, completed = calculate_profile_completion(profile)
    profile.profile_completion_percentage = percentage
    profile.profile_completed = completed
    profile.updated_at = func.now()
    profile.last_active_at = func.now()

    db.commit()
    db.refresh(profile)
    return profile


@router.delete(
    "",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete recruiter profile",
)
def delete_profile(
    db: DbSession,
    current_user: CurrentUser,
):
    if current_user.role != Role.recruiter:
        raise HTTPException(status_code=403, detail="Only recruiters allowed")

    profile = (
        db.query(RecruiterProfile)
        .filter(
            RecruiterProfile.user_id == current_user.id,
            RecruiterProfile.is_deleted.is_(False),
        )
        .first()
    )

    if not profile:
        raise HTTPException(status_code=404, detail="Recruiter profile not found")

    profile.is_deleted = True
    profile.deleted_at = func.now()
    profile.updated_at = func.now()
    db.commit()
