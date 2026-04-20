from datetime import datetime, UTC
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.core.limiter import limiter
from app.schemas.auth import (
    RegisterRequest,
    VerifyOtpRequest,
    ResendOtpRequest,
    LoginRequest,
    ForgotPasswordRequest,
    ResetPasswordRequest,
    TokenResponse,
    RefreshRequest,
    MessageResponse,
)
from app.models.user import User, Role
from app.models.applicant_profile import ApplicantProfile
from app.models.recruiter_profile import RecruiterProfile
from app.core.security import (
    hash_password,
    verify_password,
    create_access_token,
    create_refresh_token,
    decode_refresh_token,
)
from app.utils.otp import generate_otp, hash_otp, make_expiry
from app.utils.pending_store import (
    set_pending, get_pending, delete_pending, increment_attempts
)
from app.core.config import MAX_OTP_ATTEMPTS
from app.utils.email import send_otp_email

router = APIRouter(prefix="/auth", tags=["Auth"])

DbSession = Annotated[Session, Depends(get_db)]


def _get_user_by_email(db: Session, email: str) -> User | None:
    return db.query(User).filter(
        User.email == email,
        User.is_deleted.is_(False),
    ).first()


# Refesh token endpoint
@router.post("/refresh")
def refresh_token_endpoint(data: RefreshRequest):
    token = data.refresh_token

    if not token:
        raise HTTPException(status_code=400, detail="Missing refresh token")
    
    try:
        decoded = decode_refresh_token(token)

        user_id = int(decoded.get("sub"))
        role = decoded.get("role")

        new_access_token = create_access_token(user_id, role)

        return {"access_token": new_access_token}

    except Exception:
        raise HTTPException(status_code=401, detail="Invalid or expired refresh token")

# Register: send OTP
@router.post("/register", response_model=MessageResponse, status_code=status.HTTP_200_OK)
@limiter.limit("5/minute")
def register_user(request: Request, data: RegisterRequest, db: DbSession) -> MessageResponse:
    if _get_user_by_email(db, data.email):
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already registered")

    otp = generate_otp()
    set_pending(
        key=f"reg:{data.email}",
        otp_hash=hash_otp(otp),
        expiry=make_expiry(),
        password_hash=hash_password(data.password),
        role=data.role.value,
    )

    try:
        send_otp_email(data.email, otp, purpose="verify")
    except Exception:
        delete_pending(f"reg:{data.email}")
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Failed to send verification email. Please try again.",
        )

    return MessageResponse(message="OTP sent to your email. It expires in 10 minutes.")


# Verify OTP: create account
@router.post("/verify-otp", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
@limiter.limit("10/minute")
def verify_otp(request: Request, data: VerifyOtpRequest, db: DbSession) -> TokenResponse:
    key = f"reg:{data.email}"
    entry = get_pending(key)

    if not entry:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="OTP expired or not found. Please register again.",
        )

    if entry["otp_hash"] != hash_otp(data.otp):
        attempts = increment_attempts(key)
        remaining = MAX_OTP_ATTEMPTS - attempts
        if remaining <= 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Too many wrong attempts. Please register again.",
            )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid OTP. {remaining} attempt{'s' if remaining != 1 else ''} remaining.",
        )

    if _get_user_by_email(db, data.email):
        delete_pending(key)
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already registered.")

    user = User(
        email=data.email,
        password_hash=entry["password_hash"],
        role=Role(entry["role"]),
        last_active_at=datetime.now(UTC),
    )
    db.add(user)
    db.flush()

    if user.role == Role.applicant:
        db.add(ApplicantProfile(user_id=user.id, last_active_at=datetime.now(UTC)))
    elif user.role == Role.recruiter:
        db.add(RecruiterProfile(user_id=user.id, profile_completed=False))

    db.commit()
    delete_pending(key)

    access_token = create_access_token(user.id, user.role)
    refresh_token = create_refresh_token(user.id, user.role)
    return TokenResponse(access_token=access_token, refresh_token=refresh_token)


# Resend OTP
@router.post("/resend-otp", response_model=MessageResponse)
@limiter.limit("3/minute")
def resend_otp(request: Request, data: ResendOtpRequest, db: DbSession) -> MessageResponse:
    if data.purpose == "verify":
        key = f"reg:{data.email}"
        entry = get_pending(key)
        if not entry:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No pending registration found. Please register again.",
            )
        otp = generate_otp()
        set_pending(
            key=key,
            otp_hash=hash_otp(otp),
            expiry=make_expiry(),
            password_hash=entry["password_hash"],
            role=entry["role"],
        )
    else:
        key = f"reset:{data.email}"
        user = _get_user_by_email(db, data.email)
        if not user:
            return MessageResponse(message="If that email is registered, an OTP has been sent.")
        otp = generate_otp()
        set_pending(key=key, otp_hash=hash_otp(otp), expiry=make_expiry())

    try:
        send_otp_email(data.email, otp, purpose=data.purpose)
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Failed to send email. Please try again.",
        )

    return MessageResponse(message="OTP resent. It expires in 10 minutes.")


# Login
@router.post("/login", response_model=TokenResponse)
@limiter.limit("5/minute")
def login_user(request: Request, data: LoginRequest, db: DbSession) -> TokenResponse:
    user = _get_user_by_email(db, data.email)

    if not user or user.is_deleted or not verify_password(data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    user.last_active_at = datetime.now(UTC)
    db.commit()

    access_token = create_access_token(user.id, user.role)
    refresh_token = create_refresh_token(user.id, user.role)
    return TokenResponse(access_token=access_token, refresh_token=refresh_token)


# Forgot password
@router.post("/forgot-password", response_model=MessageResponse)
@limiter.limit("3/minute")
def forgot_password(request: Request, data: ForgotPasswordRequest, db: DbSession) -> MessageResponse:
    user = _get_user_by_email(db, data.email)

    if not user:
        return MessageResponse(message="If that email is registered, an OTP has been sent.")

    otp = generate_otp()
    set_pending(key=f"reset:{data.email}", otp_hash=hash_otp(otp), expiry=make_expiry())

    try:
        send_otp_email(data.email, otp, purpose="reset")
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Failed to send email. Please try again.",
        )

    return MessageResponse(message="If that email is registered, an OTP has been sent.")


# Reset password
@router.post("/reset-password", response_model=MessageResponse)
@limiter.limit("5/minute")
def reset_password(request: Request, data: ResetPasswordRequest, db: DbSession) -> MessageResponse:
    key = f"reset:{data.email}"
    entry = get_pending(key)

    if not entry:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="OTP expired or not found. Please request a new one.",
        )

    if entry["otp_hash"] != hash_otp(data.otp):
        attempts = increment_attempts(key)
        remaining = MAX_OTP_ATTEMPTS - attempts
        if remaining <= 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Too many wrong attempts. Please request a new code.",
            )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid OTP. {remaining} attempt{'s' if remaining != 1 else ''} remaining.",
        )

    user = _get_user_by_email(db, data.email)
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")

    user.password_hash = hash_password(data.new_password)
    db.commit()
    delete_pending(key)

    return MessageResponse(message="Password reset successfully. You can now log in.")