from sqlalchemy import (
    Column,
    Integer,
    String,
    Text,
    ForeignKey,
    Boolean,
    DateTime,
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.database.session import Base


class RecruiterProfile(Base):
    __tablename__ = "recruiter_profiles"

    id = Column(Integer, primary_key=True, index=True)

    user_id = Column(
        Integer,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
        index=True,
    )

    # Personal
    first_name = Column(String)
    last_name = Column(String)
    gender = Column(String)

    # Professional
    company_name = Column(String)
    job_title = Column(String)
    department = Column(String)
    bio = Column(Text)

    # Contact
    phone_number = Column(String)

    # Social / web
    linkedin_url = Column(String)
    company_website = Column(String)

    # Media
    avatar_url = Column(String)        # personal profile picture
    company_logo_url = Column(String)  # company / brand logo

    # System
    profile_completed = Column(Boolean, default=False, nullable=False)
    profile_completion_percentage = Column(Integer, default=0, nullable=False)
    is_deleted = Column(Boolean, default=False, nullable=False)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    last_active_at = Column(DateTime(timezone=True), server_default=func.now())
    deleted_at = Column(DateTime(timezone=True))

    user = relationship("User")