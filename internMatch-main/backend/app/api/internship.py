from datetime import date
from decimal import Decimal
from typing import Annotated, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy.sql import func
from sqlalchemy import Text, cast

from app.database.session import get_db
from app.deps import get_current_user
from app.models.user import User, Role
from app.models.internship import Internship
from app.schemas.internship import (
    InternshipCreate,
    InternshipUpdate,
    InternshipResponse,
    PaginatedInternshipResponse,
)

router = APIRouter(prefix="/internships", tags=["Internships"])

DbSession = Annotated[Session, Depends(get_db)]
CurrentUser = Annotated[User, Depends(get_current_user)]

# Public: list all active internships (filters + pagination)
@router.get("", response_model=PaginatedInternshipResponse, summary="List internships")
def list_internships(
    db: DbSession,
    location: Optional[str] = Query(default=None),
    job_type: Optional[str] = Query(default=None),
    skill: Optional[str] = Query(default=None),
    search: Optional[str] = Query(default=None),
    sort_by: Optional[str] = Query(
        default="newest",
        description="newest | oldest | stipend_high | stipend_low | duration_asc",
    ),
    stipend_min: Optional[Decimal] = Query(default=None, ge=0),
    stipend_max: Optional[Decimal] = Query(default=None, ge=0),
    limit: int = Query(default=12, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
):
    today = date.today()
    query = db.query(Internship).filter(
        Internship.is_active.is_(True),
        Internship.is_deleted.is_(False),
        (Internship.deadline.is_(None) | (Internship.deadline >= today)),
    )

    if location:
        query = query.filter(Internship.location.ilike(f"%{location}%"))
    if job_type:
        query = query.filter(Internship.job_type.ilike(f"%{job_type}%"))
    if search:
        query = query.filter(
            Internship.title.ilike(f"%{search}%")
            | Internship.description.ilike(f"%{search}%")
        )
    if stipend_min is not None:
        query = query.filter(Internship.stipend_amount >= stipend_min)
    if stipend_max is not None:
        query = query.filter(Internship.stipend_amount <= stipend_max)

    if skill:
        query = query.filter(
            cast(Internship.skills, Text).ilike(f"%{skill.strip()}%")
        )

    query = _apply_sort(query, sort_by)
    total = query.count()
    items = query.offset(offset).limit(limit).all()

    return PaginatedInternshipResponse(
        items=items, total=total, limit=limit, offset=offset
    )

def _apply_sort(query, sort_by: Optional[str]):
    if sort_by == "oldest":
        return query.order_by(Internship.created_at.asc())
    if sort_by == "stipend_high":
        return query.order_by(Internship.stipend_amount.desc().nullslast())
    if sort_by == "stipend_low":
        return query.order_by(Internship.stipend_amount.asc().nullslast())
    if sort_by == "duration_asc":
        return query.order_by(Internship.duration.asc().nullslast())
    return query.order_by(Internship.created_at.desc())

# Recruiter: list MY postings (paginated)
@router.get(
    "/mine",
    response_model=PaginatedInternshipResponse,
    summary="Get internships posted by the current recruiter",
)
def get_my_internships(
    db: DbSession,
    current_user: CurrentUser,
    search: Optional[str] = Query(default=None),
    limit: int = Query(default=10, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
):
    if current_user.role != Role.recruiter:
        raise HTTPException(status_code=403, detail="Only recruiters can access this")

    q = (
        db.query(Internship)
        .filter(
            Internship.posted_by == current_user.id,
            Internship.is_deleted.is_(False),
        )
    )

    if search:
        q = q.filter(Internship.title.ilike(f"%{search}%"))

    q = q.order_by(Internship.created_at.desc())
    total = q.count()
    items = q.offset(offset).limit(limit).all()

    return PaginatedInternshipResponse(items=items, total=total, limit=limit, offset=offset)

# Public: single internship
@router.get("/{internship_id}", summary="Get internship by ID")
def get_internship(internship_id: int, db: DbSession):
    internship = (
        db.query(Internship)
        .filter(
            Internship.id == internship_id,
            Internship.is_deleted.is_(False),
        )
        .first()
    )

    if not internship:
        raise HTTPException(status_code=404, detail="Internship not found")

    data = InternshipResponse.model_validate(internship)
    result = data.model_dump()
    result["deadline_passed"] = (
        internship.deadline is not None and internship.deadline < date.today()
    )
    return result

# Recruiter: create
@router.post(
    "",
    response_model=InternshipResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Post a new internship",
)
def create_internship(data: InternshipCreate, db: DbSession, current_user: CurrentUser):
    if current_user.role != Role.recruiter:
        raise HTTPException(status_code=403, detail="Only recruiters can post internships")

    internship = Internship(**data.model_dump(), posted_by=current_user.id)
    db.add(internship)
    db.commit()
    db.refresh(internship)
    return internship

# Recruiter: update
@router.put("/{internship_id}", response_model=InternshipResponse, summary="Update an internship")
def update_internship(
    internship_id: int, data: InternshipUpdate, db: DbSession, current_user: CurrentUser
):
    internship = _get_own_internship(internship_id, current_user, db)

    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(internship, field, value)

    internship.updated_at = func.now()
    db.commit()
    db.refresh(internship)
    return internship

# Recruiter: soft-delete
@router.delete("/{internship_id}", status_code=status.HTTP_204_NO_CONTENT, summary="Delete an internship")
def delete_internship(internship_id: int, db: DbSession, current_user: CurrentUser):
    internship = _get_own_internship(internship_id, current_user, db)
    internship.is_deleted = True
    internship.updated_at = func.now()
    db.commit()

def _get_own_internship(internship_id: int, current_user: User, db: Session) -> Internship:
    if current_user.role != Role.recruiter:
        raise HTTPException(status_code=403, detail="Only recruiters can manage internships")

    internship = (
        db.query(Internship)
        .filter(
            Internship.id == internship_id,
            Internship.posted_by == current_user.id,
            Internship.is_deleted.is_(False),
        )
        .first()
    )

    if not internship:
        raise HTTPException(status_code=404, detail="Internship not found")

    return internship