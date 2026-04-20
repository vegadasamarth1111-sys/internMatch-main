from typing import Annotated, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session, joinedload
from pydantic import BaseModel

from app.database.session import get_db
from app.deps import get_current_user
from app.models.user import User, Role
from app.models.saved_internship import SavedInternship
from app.models.internship import Internship
from app.schemas.saved_internship import SavedInternshipResponse, SavedInternshipCreate

router = APIRouter(prefix="/saved", tags=["Saved Internships"])

DbSession = Annotated[Session, Depends(get_db)]
CurrentUser = Annotated[User, Depends(get_current_user)]

class PaginatedSavedResponse(BaseModel):
    items: List[SavedInternshipResponse]
    total: int
    limit: int
    offset: int

    class Config:
        from_attributes = True

@router.get("", response_model=PaginatedSavedResponse)
def get_saved(
    db: DbSession,
    current_user: CurrentUser,
    search: Optional[str] = Query(default=None),
    limit: int = Query(default=10, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
):
    if current_user.role != Role.applicant:
        raise HTTPException(status_code=403, detail="Only applicants can save internships")

    q = (
        db.query(SavedInternship)
        .options(joinedload(SavedInternship.internship))
        .filter(SavedInternship.user_id == current_user.id)
        .order_by(SavedInternship.created_at.desc())
    )

    if search:
        matching_ids = (
            db.query(Internship.id)
            .filter(Internship.title.ilike(f"%{search}%"))
            .subquery()
        )
        q = q.filter(SavedInternship.internship_id.in_(matching_ids))

    total = q.count()
    items = q.offset(offset).limit(limit).all()

    return PaginatedSavedResponse(items=items, total=total, limit=limit, offset=offset)

@router.post("", response_model=SavedInternshipResponse, status_code=status.HTTP_201_CREATED)
def save_internship(data: SavedInternshipCreate, db: DbSession, current_user: CurrentUser):
    if current_user.role != Role.applicant:
        raise HTTPException(status_code=403, detail="Only applicants can save internships")

    internship = db.query(Internship).filter(
        Internship.id == data.internship_id,
        Internship.is_deleted.is_(False),
    ).first()
    if not internship:
        raise HTTPException(status_code=404, detail="Internship not found")

    existing = db.query(SavedInternship).filter(
        SavedInternship.user_id == current_user.id,
        SavedInternship.internship_id == data.internship_id,
    ).first()
    if existing:
        raise HTTPException(status_code=409, detail="Already saved")

    saved = SavedInternship(user_id=current_user.id, internship_id=data.internship_id)
    db.add(saved)
    db.commit()
    db.refresh(saved)
    return db.query(SavedInternship).options(joinedload(SavedInternship.internship)).filter(SavedInternship.id == saved.id).first()

@router.delete("/{internship_id}", status_code=status.HTTP_204_NO_CONTENT)
def unsave_internship(internship_id: int, db: DbSession, current_user: CurrentUser):
    saved = db.query(SavedInternship).filter(
        SavedInternship.user_id == current_user.id,
        SavedInternship.internship_id == internship_id,
    ).first()
    if not saved:
        raise HTTPException(status_code=404, detail="Not saved")
    db.delete(saved)
    db.commit()

@router.get("/ids", response_model=List[int])
def get_saved_ids(db: DbSession, current_user: CurrentUser):
    """Return just the internship IDs the user has saved (for UI state)."""
    if current_user.role != Role.applicant:
        return []
    rows = db.query(SavedInternship.internship_id).filter(
        SavedInternship.user_id == current_user.id
    ).all()
    return [r[0] for r in rows]