import re
from typing import Optional
from datetime import datetime

from pydantic import BaseModel, Field, field_validator


class RecruiterProfileUpdate(BaseModel):
    first_name: Optional[str] = Field(default=None, max_length=50)
    last_name: Optional[str] = Field(default=None, max_length=50)
    gender: Optional[str] = Field(default=None, max_length=20)

    company_name: Optional[str] = Field(default=None, max_length=200)
    job_title: Optional[str] = Field(default=None, max_length=100)
    department: Optional[str] = Field(default=None, max_length=100)
    bio: Optional[str] = Field(default=None, max_length=1000)

    phone_number: Optional[str] = Field(default=None, max_length=20)

    linkedin_url: Optional[str] = Field(default=None, max_length=300)
    company_website: Optional[str] = Field(default=None, max_length=300)
    # Note: company_logo_url and avatar_url are NOT in the update schema 
    # they are only set via the dedicated upload endpoints (POST /logo, POST /avatar).

    @field_validator('phone_number')
    @classmethod
    def validate_phone(cls, v: Optional[str]) -> Optional[str]:
        if not v:
            return v
        cleaned = re.sub(r'[\s\-]', '', v)
        digits = cleaned[1:] if cleaned.startswith('+') else cleaned
        if not re.match(r'^\d{7,15}$', digits):
            raise ValueError('Phone must be 7-15 digits, optionally starting with +')
        return cleaned

    @field_validator('linkedin_url', 'company_website')
    @classmethod
    def validate_urls(cls, v: Optional[str]) -> Optional[str]:
        if not v:
            return v
        if not re.match(r'^https?://', v):
            raise ValueError('URL must start with http:// or https://')
        return v


class RecruiterProfileResponse(RecruiterProfileUpdate):
    id: int
    user_id: int

    # Set via POST /recruiter/profile/avatar
    avatar_url: Optional[str] = None
    # Set via POST /recruiter/profile/logo
    company_logo_url: Optional[str] = None

    profile_completed: bool
    profile_completion_percentage: int

    created_at: datetime
    updated_at: Optional[datetime] = None
    last_active_at: Optional[datetime] = None

    class Config:
        from_attributes = True