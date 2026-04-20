from datetime import datetime
from pydantic import BaseModel
from app.schemas.internship import InternshipResponse


class SavedInternshipResponse(BaseModel):
    id: int
    user_id: int
    internship_id: int
    created_at: datetime
    internship: InternshipResponse

    class Config:
        from_attributes = True


class SavedInternshipCreate(BaseModel):
    internship_id: int