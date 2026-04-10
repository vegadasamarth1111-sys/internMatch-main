from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    ForeignKey,
    Integer,
    JSON,
    Numeric,
    String,
    Text,
    Date,
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.database.session import Base

class Internship(Base):
    __tablename__ = "internships"

    id = Column(Integer, primary_key=True, index=True)

    posted_by = Column(
        Integer,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    # Core details
    title = Column(String, nullable=False)
    description = Column(Text, nullable=False)
    location = Column(String, nullable=False)
    job_type = Column(String, nullable=False)
    duration = Column(String)

    salary = Column(String)                       # display label (kept for compat)
    stipend_amount = Column(Numeric(12, 2))       # numeric rupees per month, nullable

    # Application deadline
    deadline = Column(Date)

    skills = Column(JSON, default=list, nullable=False)

    is_active = Column(Boolean, default=True, nullable=False)
    is_deleted = Column(Boolean, default=False, nullable=False)

    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
    updated_at = Column(
        DateTime(timezone=True),
        onupdate=func.now(),
    )

    applications = relationship("Application", back_populates="internship")