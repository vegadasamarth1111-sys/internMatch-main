from datetime import datetime
from typing import Optional

from pydantic import BaseModel, EmailStr, Field


class ContactMessageCreate(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    email: EmailStr
    subject: str = Field(min_length=1, max_length=200)
    message: str = Field(min_length=10, max_length=2000)


class ContactMessageResponse(BaseModel):
    id: int
    user_id: Optional[int]
    name: str
    email: str
    subject: str
    message: str
    is_read: bool
    created_at: datetime

    class Config:
        from_attributes = True