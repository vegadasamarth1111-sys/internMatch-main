from typing import Annotated, Optional
from datetime import datetime, UTC

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy.sql import func

from app.database.session import get_db
from app.deps import get_current_user
from app.models.user import User, Role
from app.models.internship import Internship
from app.models.application import Application
from app.models.recruiter_profile import RecruiterProfile
from app.schemas.admin import (
    AdminInviteRequest,
    AdminStatsResponse,
    AdminRegisterResponse,
    PaginatedAdminInternshipsResponse,
    PaginatedAdminUsersResponse,
)
from app.core.security import hash_password
from app.core.config import ADMIN_INVITE_SECRET

router = APIRouter(prefix="/admin", tags=["Admin"])

DbSession = Annotated[Session, Depends(get_db)]
CurrentUser = Annotated[User, Depends(get_current_user)]

def require_admin(current_user: User = Depends(get_current_user)) -> User:
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Admin access required")
    return current_user

AdminUser = Annotated[User, Depends(require_admin)]

# Admin Self-Registration (Invite Secret)
@router.post(
    "/register",
    response_model=AdminRegisterResponse,
    status_code=201,
    summary="Create admin account using invite secret",
    description=(
        "No existing session required. "
        "Supply the ADMIN_INVITE_SECRET from the server .env to create a new admin account. "
        "Keep this secret out of version control. "
        "Set ADMIN_INVITE_SECRET=disabled to turn this endpoint off."
    ),
)
def admin_register(data: AdminInviteRequest, db: DbSession):
    # Guard: secret must be configured and must not be explicitly disabled
    if not ADMIN_INVITE_SECRET or ADMIN_INVITE_SECRET.lower() in ("", "disabled", "none"):
        raise HTTPException(
            status_code=403,
            detail="Admin self-registration is disabled on this server.",
        )

    # Constant-time comparison to avoid timing attacks
    import hmac
    if not hmac.compare_digest(data.invite_secret, ADMIN_INVITE_SECRET):
        raise HTTPException(status_code=403, detail="Invalid invite secret.")

    # Reject if email already exists (deleted or active)
    existing = db.query(User).filter(User.email == data.email).first()
    if existing:
        raise HTTPException(status_code=409, detail="Email already registered.")

    user = User(
        email=data.email,
        password_hash=hash_password(data.password),
        role=Role.recruiter,   # admin accounts use recruiter role by convention
        is_admin=True,
        last_active_at=datetime.now(UTC),
    )
    db.add(user)
    db.flush()

    # Give the admin a recruiter profile so profile-dependent code doesn't break
    db.add(RecruiterProfile(user_id=user.id, profile_completed=False))

    db.commit()
    return AdminRegisterResponse(
        detail="Admin account created successfully.",
        email=data.email,
    )

# Existing Routes
@router.get("/stats", response_model=AdminStatsResponse)
def get_stats(db: DbSession, _: AdminUser):
    return AdminStatsResponse(
        total_users=db.query(User).filter(User.is_deleted.is_(False)).count(),
        total_applicants=db.query(User).filter(User.role == Role.applicant, User.is_deleted.is_(False)).count(),
        total_recruiters=db.query(User).filter(User.role == Role.recruiter, User.is_deleted.is_(False)).count(),
        total_internships=db.query(Internship).filter(Internship.is_deleted.is_(False)).count(),
        active_internships=db.query(Internship).filter(
            Internship.is_active.is_(True), Internship.is_deleted.is_(False)
        ).count(),
        total_applications=db.query(Application).count(),
    )

@router.get("/users", response_model=PaginatedAdminUsersResponse)
def list_users(
    db: DbSession,
    _: AdminUser,
    role: Optional[str] = Query(default=None),
    search: Optional[str] = Query(default=None),
    user_id: Optional[int] = Query(default=None),
    limit: int = Query(default=20, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
):
    q = db.query(User)
    if user_id is not None:
        q = q.filter(User.id == user_id)
    else:
        if role:
            q = q.filter(User.role == role)
        if search:
            q = q.filter(User.email.ilike(f"%{search}%"))
    q = q.order_by(User.created_at.desc())
    total = q.count()
    items = q.offset(offset).limit(limit).all()
    return PaginatedAdminUsersResponse(items=items, total=total, limit=limit, offset=offset)

@router.patch("/users/{user_id}/ban")
def ban_user(user_id: int, db: DbSession, _: AdminUser):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if user.is_admin:
        raise HTTPException(status_code=400, detail="Cannot ban another admin")
    user.is_deleted = True
    user.deleted_at = func.now()
    db.commit()
    return {"detail": "User banned"}

@router.patch("/users/{user_id}/unban")
def unban_user(user_id: int, db: DbSession, _: AdminUser):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user.is_deleted = False
    user.deleted_at = None
    db.commit()
    return {"detail": "User unbanned"}

@router.get("/internships", response_model=PaginatedAdminInternshipsResponse)
def list_all_internships(
    db: DbSession,
    _: AdminUser,
    search: Optional[str] = Query(default=None),
    internship_id: Optional[int] = Query(default=None),
    status: Optional[str] = Query(default=None),  # active | inactive | deleted
    include_deleted: bool = Query(default=False),
    limit: int = Query(default=20, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
):
    q = db.query(Internship)

    if internship_id is not None:
        # Search by exact ID - ignore all other filters
        q = q.filter(Internship.id == internship_id)
    else:
        # Status filter takes precedence over include_deleted
        if status == "deleted":
            q = q.filter(Internship.is_deleted.is_(True))
        elif status == "active":
            q = q.filter(Internship.is_active.is_(True), Internship.is_deleted.is_(False))
        elif status == "inactive":
            q = q.filter(Internship.is_active.is_(False), Internship.is_deleted.is_(False))
        elif not include_deleted:
            q = q.filter(Internship.is_deleted.is_(False))

        if search:
            q = q.filter(Internship.title.ilike(f"%{search}%"))

    q = q.order_by(Internship.created_at.desc())
    total = q.count()
    items = q.offset(offset).limit(limit).all()
    return PaginatedAdminInternshipsResponse(items=items, total=total, limit=limit, offset=offset)

@router.delete("/internships/{internship_id}")
def delete_internship(internship_id: int, db: DbSession, _: AdminUser):
    internship = db.query(Internship).filter(Internship.id == internship_id).first()
    if not internship:
        raise HTTPException(status_code=404, detail="Internship not found")
    internship.is_deleted = True
    internship.is_active = False
    db.commit()
    return {"detail": "Internship removed"}

@router.patch("/internships/{internship_id}/toggle")
def toggle_internship(internship_id: int, db: DbSession, _: AdminUser):
    internship = db.query(Internship).filter(
        Internship.id == internship_id, Internship.is_deleted.is_(False)
    ).first()
    if not internship:
        raise HTTPException(status_code=404, detail="Internship not found")
    internship.is_active = not internship.is_active
    db.commit()
    return {
        "detail": f"Internship {'activated' if internship.is_active else 'deactivated'}",
        "is_active": internship.is_active,
    }