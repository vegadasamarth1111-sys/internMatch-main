from typing import Annotated

from fastapi import APIRouter, Depends, File, HTTPException, status, UploadFile
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
from app.core.supabase_client import get_supabase_client
from app.core.config import ALLOWED_IMAGE_TYPES, MAX_AVATAR_BYTES

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
)
def get_profile(db: DbSession, current_user: CurrentUser):
    if current_user.role != Role.applicant:
        raise HTTPException(status_code=403, detail="Only applicants can access this resource")

    profile = (
        db.query(ApplicantProfile)
        .filter(ApplicantProfile.user_id == current_user.id, ApplicantProfile.is_deleted.is_(False))
        .first()
    )
    if not profile:
        raise HTTPException(status_code=404, detail="Applicant profile not found")
    return profile


# Self: update own profile
@router.put("", response_model=ApplicantProfileResponse, summary="Update applicant profile")
def update_profile(data: ApplicantProfileUpdate, db: DbSession, current_user: CurrentUser):
    if current_user.role != Role.applicant:
        raise HTTPException(status_code=403, detail="Only applicants can update profiles")

    profile = (
        db.query(ApplicantProfile)
        .filter(ApplicantProfile.user_id == current_user.id, ApplicantProfile.is_deleted.is_(False))
        .first()
    )
    if not profile:
        raise HTTPException(status_code=404, detail="Applicant profile not found")

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


# Self: upload profile picture
@router.post("/avatar", response_model=ApplicantProfileResponse, summary="Upload profile picture")
def upload_avatar(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role != Role.applicant:
        raise HTTPException(status_code=403, detail="Only applicants can upload a profile picture")

    profile = (
        db.query(ApplicantProfile)
        .filter(ApplicantProfile.user_id == current_user.id, ApplicantProfile.is_deleted.is_(False))
        .first()
    )
    if not profile:
        raise HTTPException(status_code=404, detail="Applicant profile not found")

    if file.content_type not in ALLOWED_IMAGE_TYPES:
        raise HTTPException(status_code=400, detail="Only JPEG, PNG, WebP, or GIF images are allowed")

    content = file.file.read()
    if len(content) > MAX_AVATAR_BYTES:
        raise HTTPException(status_code=400, detail="Image exceeds 2 MB limit")

    try:
        supabase = get_supabase_client()
        public_url = supabase.upload_avatar(
            user_id=current_user.id,
            file_content=content,
            filename=file.filename or "avatar.jpg",
            content_type=file.content_type,
        )
        profile.avatar_url = public_url
        db.commit()
        db.refresh(profile)
        return profile
    except Exception as e:
        import traceback; traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Avatar upload failed: {str(e)}")


# Self: delete own profile
@router.delete("", status_code=status.HTTP_204_NO_CONTENT, summary="Delete applicant profile")
def delete_profile(db: DbSession, current_user: CurrentUser):
    if current_user.role != Role.applicant:
        raise HTTPException(status_code=403, detail="Only applicants can delete profiles")

    profile = (
        db.query(ApplicantProfile)
        .filter(ApplicantProfile.user_id == current_user.id, ApplicantProfile.is_deleted.is_(False))
        .first()
    )
    if not profile:
        raise HTTPException(status_code=404, detail="Applicant profile not found")

    profile.is_deleted = True
    profile.updated_at = func.now()
    db.commit()


# Recruiter: view any applicant's profile by user_id
@router.get(
    "/{user_id}",
    response_model=ApplicantProfileResponse,
    summary="Get applicant profile by user ID (recruiter only)",
)
def get_profile_by_id(user_id: int, db: DbSession, current_user: CurrentUser):
    if current_user.role != Role.recruiter:
        raise HTTPException(status_code=403, detail="Only recruiters can view other applicant profiles")

    profile = (
        db.query(ApplicantProfile)
        .filter(ApplicantProfile.user_id == user_id, ApplicantProfile.is_deleted.is_(False))
        .first()
    )
    if not profile:
        raise HTTPException(status_code=404, detail="Applicant profile not found")
    return profile