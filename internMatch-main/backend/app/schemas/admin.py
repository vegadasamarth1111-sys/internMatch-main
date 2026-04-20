from datetime import datetime
from typing import List

from pydantic import BaseModel
from pydantic import BaseModel, EmailStr, Field


class AdminUserResponse(BaseModel):
    id: int
    email: str
    role: str
    is_admin: bool
    is_deleted: bool
    created_at: datetime

    class Config:
        from_attributes = True


class AdminInternshipResponse(BaseModel):
    id: int
    title: str
    location: str
    is_active: bool
    is_deleted: bool
    posted_by: int
    created_at: datetime

    class Config:
        from_attributes = True


class AdminStatsResponse(BaseModel):
    total_users: int
    total_applicants: int
    total_recruiters: int
    total_internships: int
    active_internships: int
    total_applications: int


class PaginatedAdminUsersResponse(BaseModel):
    items: List[AdminUserResponse]
    total: int
    limit: int
    offset: int


class PaginatedAdminInternshipsResponse(BaseModel):
    items: List[AdminInternshipResponse]
    total: int
    limit: int
    offset: int


class AdminInviteRequest(BaseModel):
    """
    Secure admin registration request.
    Requires the ADMIN_INVITE_SECRET set in the server's .env file.
    Share this secret only with trusted people who should have admin access.
    """
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    invite_secret: str = Field(min_length=1)


class AdminRegisterResponse(BaseModel):
    detail: str
    email: str