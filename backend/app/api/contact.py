from typing import Annotated, Optional

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.deps import get_current_user_optional
from app.models.user import User
from app.models.contact import ContactMessage
from app.schemas.contact import ContactMessageCreate, ContactMessageResponse

router = APIRouter(prefix="/contact", tags=["Contact"])

DbSession = Annotated[Session, Depends(get_db)]
OptionalUser = Annotated[Optional[User], Depends(get_current_user_optional)]


@router.post(
    "",
    response_model=ContactMessageResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Submit a contact message",
    description="Public endpoint — works for both guests and logged-in users.",
)
def submit_contact(
    data: ContactMessageCreate,
    db: DbSession,
    current_user: OptionalUser,
):
    message = ContactMessage(
        user_id=current_user.id if current_user else None,
        name=data.name,
        email=data.email,
        subject=data.subject,
        message=data.message,
    )
    db.add(message)
    db.commit()
    db.refresh(message)
    return message