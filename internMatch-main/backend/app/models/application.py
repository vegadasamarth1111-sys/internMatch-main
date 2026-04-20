import enum

from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    Enum as SAEnum,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.database.session import Base


class ApplicationStatus(str, enum.Enum):
    applied = "applied"
    accepted = "accepted"
    rejected = "rejected"
    withdrawn = "withdrawn"


class Application(Base):
    __tablename__ = "applications"

    # One applicant can only apply once per internship
    __table_args__ = (
        UniqueConstraint("internship_id", "applicant_id", name="uq_application"),
    )

    id = Column(Integer, primary_key=True, index=True)

    internship_id = Column(
        Integer,
        ForeignKey("internships.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    applicant_id = Column(
        Integer,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    cover_letter = Column(Text)
    resume_path = Column(String)
    is_deleted = Column(Boolean, nullable=False, default=False)

    status = Column(
        SAEnum(ApplicationStatus),
        default=ApplicationStatus.applied,
        nullable=False,
    )

    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
    updated_at = Column(
        DateTime(timezone=True),
        onupdate=func.now(),
    )

    # Relationships
    internship = relationship("Internship", back_populates="applications")
    applicant = relationship("User", backref="applications")