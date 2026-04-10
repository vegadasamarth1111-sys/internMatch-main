from typing import Annotated

from pydantic import BaseModel, EmailStr, Field

from app.models.user import Role


class RegisterRequest(BaseModel):
    role: Role = Field(..., example="applicant")
    email: Annotated[EmailStr, Field(example="user@example.com")]
    password: Annotated[str, Field(min_length=8, example="StrongPassword123")]


class VerifyOtpRequest(BaseModel):
    email: EmailStr
    otp: Annotated[str, Field(min_length=6, max_length=6, example="123456")]


class ResendOtpRequest(BaseModel):
    email: EmailStr
    purpose: str = Field(default="verify", pattern="^(verify|reset)$")


class LoginRequest(BaseModel):
    email: Annotated[EmailStr, Field(example="user@example.com")]
    password: Annotated[str, Field(min_length=8, example="StrongPassword123")]


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    email: EmailStr
    otp: Annotated[str, Field(min_length=6, max_length=6)]
    new_password: Annotated[str, Field(min_length=8)]


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"

class RefreshRequest(BaseModel):
    refresh_token: str

class MessageResponse(BaseModel):
    message: str