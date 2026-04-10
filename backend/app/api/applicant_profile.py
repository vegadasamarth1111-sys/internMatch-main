from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy.sql import func

from app.database.session import get_db
from app.deps import get_current_user
from app.models.user import User, Role
from app.models.applicant_profile import ApplicantProfile
from app.schemas.applicant_profile import (
    ApplicantProfileResponse,
    ApplicantProfileUpdate,
)
from app.utils.profile_completion import calculate_profile_completion

router = APIRouter(
    prefix="/applicant/profile",
    tags=["Applicant Profile"],
)

DbSession = Annotated[Session, Depends(get_db)]
CurrentUser = Annotated[User, Depends(get_current_user)]


# Self: get own profile

@router.get(
    "",
    response_model=ApplicantProfileResponse,
    summary="Get own applicant profile",
    description="Returns the authenticated applicant's own profile.",
)
def get_profile(
    db: DbSession,
    current_user: CurrentUser,
):
    if current_user.role != Role.applicant:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only applicants can access this resource",
        )

    profile = (
        db.query(ApplicantProfile)
        .filter(
            ApplicantProfile.user_id == current_user.id,
            ApplicantProfile.is_deleted.is_(False),
        )
        .first()
    )

    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Applicant profile not found",
        )

    return profile


# Self: update own profile

@router.put(
    "",
    response_model=ApplicantProfileResponse,
    summary="Update applicant profile",
)
def update_profile(
    data: ApplicantProfileUpdate,
    db: DbSession,
    current_user: CurrentUser,
):
    if current_user.role != Role.applicant:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only applicants can update profiles",
        )

    profile = (
        db.query(ApplicantProfile)
        .filter(
            ApplicantProfile.user_id == current_user.id,
            ApplicantProfile.is_deleted.is_(False),
        )
        .first()
    )

    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Applicant profile not found",
        )

    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(profile, field, value)

    percentage, completed = calculate_profile_completion(profile)
    profile.profile_completion_percentage = percentage
    profile.profile_completed = completed
    profile.updated_at = func.now()
    profile.last_active_at = func.now()

    db.commit()
    db.refresh(profile)
    return profile


# Self: delete own profile

@router.delete(
    "",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete applicant profile",
)
def delete_profile(
    db: DbSession,
    current_user: CurrentUser,
):
    if current_user.role != Role.applicant:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only applicants can delete profiles",
        )

    profile = (
        db.query(ApplicantProfile)
        .filter(
            ApplicantProfile.user_id == current_user.id,
            ApplicantProfile.is_deleted.is_(False),
        )
        .first()
    )

    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Applicant profile not found",
        )

    profile.is_deleted = True
    profile.updated_at = func.now()
    db.commit()


# Recruiter: view any applicant's profile by user_id

@router.get(
    "/{user_id}",
    response_model=ApplicantProfileResponse,
    summary="Get applicant profile by user ID (recruiter only)",
)
def get_profile_by_id(
    user_id: int,
    db: DbSession,
    current_user: CurrentUser,
):
    if current_user.role != Role.recruiter:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only recruiters can view other applicant profiles",
        )

    profile = (
        db.query(ApplicantProfile)
        .filter(
            ApplicantProfile.user_id == user_id,
            ApplicantProfile.is_deleted.is_(False),
        )
        .first()
    )

    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Applicant profile not found",
        )

    return profile