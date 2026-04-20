from typing import Annotated, List, Optional

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile, status
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import or_
from pydantic import BaseModel

from app.core.config import MAX_UPLOAD_BYTES
from app.core.supabase_client import get_supabase_client
from app.database.session import get_db
from app.deps import get_current_user
from app.models.user import User, Role
from app.models.application import Application, ApplicationStatus
from app.models.applicant_profile import ApplicantProfile
from app.models.internship import Internship
from app.schemas.application import (
    ApplicationCreate,
    ApplicationResponse,
    ApplicationStatusUpdate,
    ApplicationWithInternship,
    ApplicantSummary,
)
from app.utils.file_validation import is_valid_resume
from app.utils.email import send_status_change_email
from app.models.recruiter_profile import RecruiterProfile

router = APIRouter(prefix="/applications", tags=["Applications"])

DbSession = Annotated[Session, Depends(get_db)]
CurrentUser = Annotated[User, Depends(get_current_user)]

class PaginatedApplicationsResponse(BaseModel):
    items: List[ApplicationWithInternship]
    total: int
    limit: int
    offset: int

    class Config:
        from_attributes = True

class PaginatedApplicationResponse(BaseModel):
    items: List[ApplicationResponse]
    total: int
    limit: int
    offset: int

    class Config:
        from_attributes = True

def _enrich_with_applicant(application: Application, db: Session) -> ApplicationResponse:
    profile = db.query(ApplicantProfile).filter(
        ApplicantProfile.user_id == application.applicant_id,
        ApplicantProfile.is_deleted.is_(False),
    ).first()

    summary = ApplicantSummary(
        id=application.applicant.id,
        email=application.applicant.email,
        first_name=profile.first_name if profile else None,
        last_name=profile.last_name if profile else None,
    )

    data = ApplicationResponse.model_validate(application)
    data.applicant = summary
    return data

@router.post("", response_model=ApplicationResponse, status_code=status.HTTP_201_CREATED)
def create_application(data: ApplicationCreate, db: DbSession, current_user: CurrentUser):
    if current_user.role != Role.applicant:
        raise HTTPException(status_code=403, detail="Only applicants can apply")

    internship = db.query(Internship).filter(
        Internship.id == data.internship_id,
        Internship.is_active.is_(True),
        Internship.is_deleted.is_(False),
    ).first()
    if not internship:
        raise HTTPException(status_code=404, detail="Internship not found or no longer active")

    existing = db.query(Application).filter(
        Application.internship_id == data.internship_id,
        Application.applicant_id == current_user.id,
    ).first()
    if existing:
        raise HTTPException(status_code=409, detail="You have already applied for this internship")

    application = Application(
        internship_id=data.internship_id,
        applicant_id=current_user.id,
        cover_letter=data.cover_letter,
    )
    db.add(application)
    db.commit()
    db.refresh(application)
    return application

@router.get("/mine", response_model=PaginatedApplicationsResponse)
def get_my_applications(
    db: DbSession,
    current_user: CurrentUser,
    search: Optional[str] = Query(default=None),
    limit: int = Query(default=10, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
):
    if current_user.role != Role.applicant:
        raise HTTPException(status_code=403, detail="Only applicants can access this")

    q = (
        db.query(Application)
        .options(joinedload(Application.internship))
        .filter(Application.applicant_id == current_user.id)
        .order_by(Application.created_at.desc())
    )

    if search:
        matching_ids = (
            db.query(Internship.id)
            .filter(Internship.title.ilike(f"%{search}%"))
            .subquery()
        )
        q = q.filter(Application.internship_id.in_(matching_ids))

    total = q.count()
    items = q.offset(offset).limit(limit).all()

    return PaginatedApplicationsResponse(items=items, total=total, limit=limit, offset=offset)

@router.get("/internship/{internship_id}", response_model=PaginatedApplicationResponse)
def get_applications_for_internship(
    internship_id: int,
    db: DbSession,
    current_user: CurrentUser,
    search: Optional[str] = Query(default=None),
    limit: int = Query(default=10, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
):
    if current_user.role != Role.recruiter:
        raise HTTPException(status_code=403, detail="Only recruiters can access this")

    internship = db.query(Internship).filter(
        Internship.id == internship_id,
        Internship.posted_by == current_user.id,
        Internship.is_deleted.is_(False),
    ).first()
    if not internship:
        raise HTTPException(status_code=404, detail="Internship not found")

    q = (
        db.query(Application)
        .options(joinedload(Application.applicant))
        .filter(Application.internship_id == internship_id)
        .order_by(Application.created_at.desc())
    )

    if search:
        search_term = f"%{search}%"
        matching_applicant_ids = (
            db.query(User.id)
            .outerjoin(ApplicantProfile, User.id == ApplicantProfile.user_id)
            .filter(
                or_(
                    User.email.ilike(search_term),
                    ApplicantProfile.first_name.ilike(search_term),
                    ApplicantProfile.last_name.ilike(search_term),
                )
            )
            .subquery()
        )
        q = q.filter(Application.applicant_id.in_(matching_applicant_ids))

    total = q.count()
    applications = q.offset(offset).limit(limit).all()

    return PaginatedApplicationResponse(
        items=[_enrich_with_applicant(app, db) for app in applications],
        total=total,
        limit=limit,
        offset=offset,
    )

@router.get("/{application_id}", response_model=ApplicationWithInternship)
def get_application(application_id: int, db: DbSession, current_user: CurrentUser):
    application = (
        db.query(Application)
        .options(joinedload(Application.internship))
        .filter(Application.id == application_id)
        .first()
    )

    if not application:
        raise HTTPException(status_code=404, detail="Application not found")

    if current_user.role == Role.applicant:
        if application.applicant_id != current_user.id:
            raise HTTPException(status_code=403, detail="Access denied")
    elif current_user.role == Role.recruiter:
        if application.internship.posted_by != current_user.id:
            raise HTTPException(status_code=403, detail="Access denied")

    return application

@router.patch("/{application_id}/status", response_model=ApplicationResponse)
def update_status(
    application_id: int,
    data: ApplicationStatusUpdate,
    db: DbSession,
    current_user: CurrentUser,
):
    application = db.query(Application).filter(Application.id == application_id).first()

    if not application:
        raise HTTPException(status_code=404, detail="Application not found")

    if current_user.role == Role.recruiter:
        if data.status not in (ApplicationStatus.accepted, ApplicationStatus.rejected):
            raise HTTPException(status_code=400, detail="Recruiters can only accept or reject")
        if application.internship.posted_by != current_user.id:
            raise HTTPException(status_code=403, detail="Access denied")
    elif current_user.role == Role.applicant:
        if data.status != ApplicationStatus.withdrawn:
            raise HTTPException(status_code=400, detail="Applicants can only withdraw")
        if application.applicant_id != current_user.id:
            raise HTTPException(status_code=403, detail="Access denied")

    application.status = data.status

    if data.status in (ApplicationStatus.accepted, ApplicationStatus.rejected):
        try:
            applicant_profile = db.query(ApplicantProfile).filter(
                ApplicantProfile.user_id == application.applicant_id
            ).first()
            recruiter_profile = db.query(RecruiterProfile).filter(
                RecruiterProfile.user_id == current_user.id
            ).first()
            applicant_name = (
                f"{applicant_profile.first_name or ''} {applicant_profile.last_name or ''}".strip()
                or application.applicant.email
            ) if applicant_profile else application.applicant.email
            company_name = recruiter_profile.company_name if recruiter_profile else "The recruiter"
            send_status_change_email(
                to_email=application.applicant.email,
                applicant_name=applicant_name,
                internship_title=application.internship.title,
                company_name=company_name,
                new_status=data.status.value,
            )
        except Exception:
            pass

    if data.status == ApplicationStatus.withdrawn:
        db.delete(application)
        db.commit()
        return ApplicationResponse(
            id=application.id,
            internship_id=application.internship_id,
            applicant_id=application.applicant_id,
            cover_letter=application.cover_letter,
            resume_path=application.resume_path,
            status=application.status,
            created_at=application.created_at,
            updated_at=application.updated_at,
        )

    db.commit()
    db.refresh(application)
    return application

@router.post("/{application_id}/resume", response_model=ApplicationResponse)
def upload_resume(
    application_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role != Role.applicant:
        raise HTTPException(status_code=403, detail="Only applicants can upload resumes")

    application = db.query(Application).filter(
        Application.id == application_id,
        Application.applicant_id == current_user.id,
    ).first()

    if not application:
        raise HTTPException(status_code=404, detail="Application not found")

    content = file.file.read()

    if len(content) > MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=400, detail="File exceeds the 5 MB limit")

    if not is_valid_resume(content):
        raise HTTPException(
            status_code=400,
            detail="Invalid file type. Only PDF or Word documents (.pdf, .doc, .docx) are accepted.",
        )

    try:
        supabase = get_supabase_client()
        storage_path = supabase.upload_resume(
            user_id=current_user.id,
            internship_id=application.internship_id,
            file_content=content,
            filename=file.filename or "resume.pdf",
        )
        public_url = supabase.get_public_url(storage_path)
        application.resume_path = public_url

        db.commit()
        db.refresh(application)
        return application

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")