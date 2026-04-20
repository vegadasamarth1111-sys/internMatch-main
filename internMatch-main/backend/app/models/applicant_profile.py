from sqlalchemy import (
    Column,
    Integer,
    String,
    Date,
    Boolean,
    ForeignKey,
    DateTime,
    JSON,
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.database.session import Base


class ApplicantProfile(Base):
    __tablename__ = "applicant_profiles"

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
    dob = Column(Date)
    gender = Column(String)

    # Location
    city = Column(String)
    state = Column(String)
    country = Column(String)

    # Contact
    phone = Column(String)

    # Education
    education_level = Column(String)
    degree_name = Column(String)
    university_name = Column(String)
    graduation_year = Column(Integer)
    gpa = Column(String)

    # Skills & bio
    skills = Column(JSON, default=list, nullable=False)
    headline = Column(String)
    bio = Column(String)

    # Extras
    languages_spoken = Column(JSON)
    hobbies = Column(JSON)

    # Links
    portfolio_url = Column(String)
    github_url = Column(String)
    linkedin_url = Column(String)

    # Media
    avatar_url = Column(String)   # profile picture - stored in Supabase avatars/ folder

    # System
    is_deleted = Column(Boolean, default=False, nullable=False)
    profile_completed = Column(Boolean, default=False, nullable=False)
    profile_completion_percentage = Column(Integer, default=0, nullable=False)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    last_active_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", backref="applicant_profile", uselist=False)