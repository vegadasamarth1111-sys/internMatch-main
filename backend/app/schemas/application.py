from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field

from app.models.application import ApplicationStatus
from app.schemas.internship import InternshipResponse


class ApplicationCreate(BaseModel):
    internship_id: int
    cover_letter: Optional[str] = Field(default=None, max_length=3000)


class ApplicationStatusUpdate(BaseModel):
    status: ApplicationStatus


class ApplicantSummary(BaseModel):
    id: int
    email: str
    first_name: Optional[str] = None
    last_name: Optional[str] = None

    class Config:
        from_attributes = True


class ApplicationResponse(BaseModel):
    id: int
    internship_id: int
    applicant_id: int
    applicant: Optional[ApplicantSummary] = None
    cover_letter: Optional[str] = None
    resume_path: Optional[str] = None
    status: ApplicationStatus
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class ApplicationWithInternship(ApplicationResponse):
    internship: InternshipResponse