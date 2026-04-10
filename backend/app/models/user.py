import enum

from sqlalchemy import Boolean, Column, DateTime, Integer, String, Enum as SAEnum
from sqlalchemy.sql import func

from app.database.session import Base


class Role(str, enum.Enum):
    applicant = "applicant"
    recruiter = "recruiter"


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True)
    email = Column(String, unique=True, nullable=False, index=True)
    password_hash = Column(String, nullable=False)
    role = Column(SAEnum(Role), nullable=False)

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
    last_active_at = Column(DateTime(timezone=True))
    deleted_at = Column(DateTime(timezone=True))