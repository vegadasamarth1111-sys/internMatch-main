from datetime import date, datetime
from decimal import Decimal
from typing import List, Optional

from pydantic import BaseModel, Field, field_validator, model_validator


class InternshipCreate(BaseModel):
    title: str = Field(min_length=3, max_length=200)
    description: str = Field(min_length=10, max_length=5000)
    location: str = Field(min_length=2, max_length=200)
    job_type: str = Field(min_length=2, max_length=50)
    duration: Optional[str] = Field(default=None, max_length=50)
    salary: Optional[str] = Field(default=None, max_length=100)
    stipend_amount: Optional[Decimal] = Field(default=None, ge=0, le=500000)
    deadline: Optional[date] = None
    skills: List[str] = Field(default_factory=list, max_length=30)

    @field_validator('deadline')
    @classmethod
    def deadline_not_in_past(cls, v: Optional[date]) -> Optional[date]:
        if v is not None and v < date.today():
            raise ValueError('Application deadline cannot be in the past')
        return v


class InternshipUpdate(BaseModel):
    title: Optional[str] = Field(default=None, min_length=3, max_length=200)
    description: Optional[str] = Field(default=None, min_length=10, max_length=5000)
    location: Optional[str] = Field(default=None, min_length=2, max_length=200)
    job_type: Optional[str] = Field(default=None, min_length=2, max_length=50)
    duration: Optional[str] = Field(default=None, max_length=50)
    salary: Optional[str] = Field(default=None, max_length=100)
    stipend_amount: Optional[Decimal] = Field(default=None, ge=0, le=500000)
    deadline: Optional[date] = None
    skills: Optional[List[str]] = Field(default=None, max_length=30)
    is_active: Optional[bool] = None


class InternshipResponse(BaseModel):
    id: int
    posted_by: int
    title: str
    description: str
    location: str
    job_type: str
    duration: Optional[str]
    salary: Optional[str]
    stipend_amount: Optional[Decimal] = None
    deadline: Optional[date] = None
    skills: List[str]
    is_active: bool
    created_at: datetime
    updated_at: Optional[datetime]

    class Config:
        from_attributes = True


class PaginatedInternshipResponse(BaseModel):
    items: List[InternshipResponse]
    total: int
    limit: int
    offset: int