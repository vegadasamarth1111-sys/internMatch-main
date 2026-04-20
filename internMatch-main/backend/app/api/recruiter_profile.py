from typing import Annotated, Optional, List
from datetime import date

from fastapi import APIRouter, Depends, File, HTTPException, status, UploadFile
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy.sql import func

from app.database.session import get_db
from app.deps import get_current_user
from app.models.user import User, Role
from app.models.recruiter_profile import RecruiterProfile
from app.models.internship import Internship
from app.schemas.recruiter_profile import RecruiterProfileUpdate, RecruiterProfileResponse
from app.schemas.internship import InternshipResponse
from app.utils.profile_completion import calculate_profile_completion
from app.core.supabase_client import get_supabase_client
from app.core.config import ALLOWED_IMAGE_TYPES, MAX_AVATAR_BYTES

router = APIRouter(prefix="/recruiter/profile", tags=["Recruiter Profile"])
public_router = APIRouter(prefix="/company", tags=["Company Profile"])

DbSession = Annotated[Session, Depends(get_db)]
CurrentUser = Annotated[User, Depends(get_current_user)]


# Own profile CRUD
@router.get("", response_model=RecruiterProfileResponse, summary="Get recruiter profile")
def get_profile(db: DbSession, current_user: CurrentUser):
    if current_user.role != Role.recruiter:
        raise HTTPException(status_code=403, detail="Only recruiters allowed")
    profile = (
        db.query(RecruiterProfile)
        .filter(RecruiterProfile.user_id == current_user.id, RecruiterProfile.is_deleted.is_(False))
        .first()
    )
    if not profile:
        raise HTTPException(status_code=404, detail="Recruiter profile not found")
    return profile


@router.put("", response_model=RecruiterProfileResponse, summary="Update recruiter profile")
def update_profile(data: RecruiterProfileUpdate, db: DbSession, current_user: CurrentUser):
    if current_user.role != Role.recruiter:
        raise HTTPException(status_code=403, detail="Only recruiters allowed")
    profile = (
        db.query(RecruiterProfile)
        .filter(RecruiterProfile.user_id == current_user.id, RecruiterProfile.is_deleted.is_(False))
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


@router.delete("", status_code=status.HTTP_204_NO_CONTENT, summary="Delete recruiter profile")
def delete_profile(db: DbSession, current_user: CurrentUser):
    if current_user.role != Role.recruiter:
        raise HTTPException(status_code=403, detail="Only recruiters allowed")
    profile = (
        db.query(RecruiterProfile)
        .filter(RecruiterProfile.user_id == current_user.id, RecruiterProfile.is_deleted.is_(False))
        .first()
    )
    if not profile:
        raise HTTPException(status_code=404, detail="Recruiter profile not found")
    profile.is_deleted = True
    profile.deleted_at = func.now()
    profile.updated_at = func.now()
    db.commit()


# Profile picture (avatar)
@router.post("/avatar", response_model=RecruiterProfileResponse, summary="Upload profile picture")
def upload_avatar(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role != Role.recruiter:
        raise HTTPException(status_code=403, detail="Only recruiters allowed")

    profile = (
        db.query(RecruiterProfile)
        .filter(RecruiterProfile.user_id == current_user.id, RecruiterProfile.is_deleted.is_(False))
        .first()
    )
    if not profile:
        raise HTTPException(status_code=404, detail="Recruiter profile not found")

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


# Company logo
@router.post("/logo", response_model=RecruiterProfileResponse, summary="Upload company logo")
def upload_logo(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role != Role.recruiter:
        raise HTTPException(status_code=403, detail="Only recruiters allowed")

    profile = (
        db.query(RecruiterProfile)
        .filter(RecruiterProfile.user_id == current_user.id, RecruiterProfile.is_deleted.is_(False))
        .first()
    )
    if not profile:
        raise HTTPException(status_code=404, detail="Recruiter profile not found")

    if file.content_type not in ALLOWED_IMAGE_TYPES:
        raise HTTPException(status_code=400, detail="Only JPEG, PNG, WebP, or GIF images are allowed")

    content = file.file.read()
    if len(content) > MAX_AVATAR_BYTES:
        raise HTTPException(status_code=400, detail="Image exceeds 2 MB limit")

    try:
        supabase = get_supabase_client()
        public_url = supabase.upload_logo(
            user_id=current_user.id,
            file_content=content,
            filename=file.filename or "logo.png",
            content_type=file.content_type,
        )
        profile.company_logo_url = public_url
        db.commit()
        db.refresh(profile)
        return profile
    except Exception as e:
        import traceback; traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Logo upload failed: {str(e)}")


# Public company profile
class PublicCompanyProfile(BaseModel):
    user_id: int
    company_name: Optional[str] = None
    company_logo_url: Optional[str] = None
    company_website: Optional[str] = None
    bio: Optional[str] = None
    linkedin_url: Optional[str] = None
    job_title: Optional[str] = None
    internships: List[InternshipResponse] = []

    class Config:
        from_attributes = True


@public_router.get("/{user_id}", response_model=PublicCompanyProfile, summary="Public company profile")
def get_company_profile(user_id: int, db: Session = Depends(get_db)):
    profile = (
        db.query(RecruiterProfile)
        .filter(RecruiterProfile.user_id == user_id, RecruiterProfile.is_deleted.is_(False))
        .first()
    )
    if not profile:
        raise HTTPException(status_code=404, detail="Company not found")

    today = date.today()
    internships = (
        db.query(Internship)
        .filter(
            Internship.posted_by == user_id,
            Internship.is_active.is_(True),
            Internship.is_deleted.is_(False),
            (Internship.deadline.is_(None) | (Internship.deadline >= today)),
        )
        .order_by(Internship.created_at.desc())
        .all()
    )

    return PublicCompanyProfile(
        user_id=profile.user_id,
        company_name=profile.company_name,
        company_logo_url=profile.company_logo_url,
        company_website=profile.company_website,
        bio=profile.bio,
        linkedin_url=profile.linkedin_url,
        job_title=profile.job_title,
        internships=[InternshipResponse.model_validate(i) for i in internships],
    )