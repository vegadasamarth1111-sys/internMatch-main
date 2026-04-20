from typing import Annotated, List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload

from app.database.session import get_db
from app.deps import get_current_user
from app.models.user import User, Role
from app.models.message import Message
from app.models.application import Application
from app.schemas.message import MessageCreate, MessageResponse

router = APIRouter(prefix="/chat", tags=["Chat"])

DbSession = Annotated[Session, Depends(get_db)]
CurrentUser = Annotated[User, Depends(get_current_user)]


def _assert_access(application: Application, current_user: User) -> None:
    """Ensure only the applicant or the internship's recruiter can access chat."""
    if current_user.role == Role.applicant:
        if application.applicant_id != current_user.id:
            raise HTTPException(status_code=403, detail="Access denied")
    elif current_user.role == Role.recruiter:
        if application.internship.posted_by != current_user.id:
            raise HTTPException(status_code=403, detail="Access denied")


@router.get("/{application_id}", response_model=List[MessageResponse])
def get_messages(application_id: int, db: DbSession, current_user: CurrentUser):
    application = (
        db.query(Application)
        .options(joinedload(Application.internship))
        .filter(Application.id == application_id)
        .first()
    )
    if not application:
        raise HTTPException(status_code=404, detail="Application not found")
    _assert_access(application, current_user)

    return (
        db.query(Message)
        .options(joinedload(Message.sender))
        .filter(Message.application_id == application_id, Message.is_deleted.is_(False))
        .order_by(Message.created_at.asc())
        .all()
    )


@router.post("/{application_id}", response_model=MessageResponse)
def send_message(application_id: int, data: MessageCreate, db: DbSession, current_user: CurrentUser):
    application = (
        db.query(Application)
        .options(joinedload(Application.internship))
        .filter(Application.id == application_id)
        .first()
    )
    if not application:
        raise HTTPException(status_code=404, detail="Application not found")
    _assert_access(application, current_user)

    msg = Message(
        application_id=application_id,
        sender_id=current_user.id,
        content=data.content.strip(),
    )
    db.add(msg)
    db.commit()
    db.refresh(msg)
    return db.query(Message).options(joinedload(Message.sender)).filter(Message.id == msg.id).first()