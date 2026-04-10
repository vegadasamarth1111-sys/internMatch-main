import re
from pydantic import field_validator
from datetime import date, datetime
from typing import List, Optional

from pydantic import BaseModel, Field, field_validator


def _validate_url(v: Optional[str]) -> Optional[str]:
    if not v:
        return v
    if not re.match(r'^https?://', v):
        raise ValueError('URL must start with http:// or https://')
    return v


class ApplicantProfileBase(BaseModel):
    first_name: Optional[str] = Field(default=None, max_length=50)
    last_name: Optional[str] = Field(default=None, max_length=50)

    dob: Optional[date] = None
    gender: Optional[str] = Field(default=None, max_length=20)

    city: Optional[str] = Field(default=None, max_length=100)
    state: Optional[str] = Field(default=None, max_length=100)
    country: Optional[str] = Field(default=None, max_length=100)

    phone: Optional[str] = Field(default=None, max_length=20)

    education_level: Optional[str] = Field(default=None, max_length=50)
    degree_name: Optional[str] = Field(default=None, max_length=100)
    university_name: Optional[str] = Field(default=None, max_length=200)

    graduation_year: Optional[int] = Field(default=None, ge=1950, le=2100)
    gpa: Optional[str] = Field(default=None, max_length=10)

    skills: Optional[List[str]] = Field(default=None, max_length=50)

    headline: Optional[str] = Field(default=None, max_length=150)
    bio: Optional[str] = Field(default=None, max_length=1000)

    languages_spoken: Optional[List[str]] = Field(default=None, max_length=20)
    hobbies: Optional[List[str]] = Field(default=None, max_length=20)

    portfolio_url: Optional[str] = Field(default=None, max_length=300)
    github_url: Optional[str] = Field(default=None, max_length=300)
    linkedin_url: Optional[str] = Field(default=None, max_length=300)

    @field_validator('phone')
    @classmethod
    def validate_phone(cls, v: Optional[str]) -> Optional[str]:
        if not v:
            return v
        
        cleaned = re.sub(r'[\s\-]', '', v)

        digits = cleaned[1:] if cleaned.startswith('+') else cleaned

        if not re.match(r'^\d{7,15}$', digits):
            raise ValueError('Phone must be 7–15 digits, optionally starting with +')

        return cleaned 

    @field_validator('gpa')
    @classmethod
    def validate_gpa(cls, v: Optional[str]) -> Optional[str]:
        if not v:
            return v
        try:
            val = float(v)
        except ValueError:
            raise ValueError('GPA must be a number')
        if not (0.0 <= val <= 10.0):
            raise ValueError('GPA must be between 0.0 and 10.0')
        return v

    @field_validator('portfolio_url', 'github_url', 'linkedin_url')
    @classmethod
    def validate_urls(cls, v: Optional[str]) -> Optional[str]:
        if not v:
            return v
        if not re.match(r'^https?://', v):
            raise ValueError('URL must start with http:// or https://')
        return v


class ApplicantProfileUpdate(ApplicantProfileBase):
    pass


class ApplicantProfileResponse(ApplicantProfileBase):
    id: int
    user_id: int

    profile_completed: bool
    profile_completion_percentage: int

    created_at: datetime
    updated_at: Optional[datetime] = None
    last_active_at: Optional[datetime] = None

    class Config:
        from_attributes = True