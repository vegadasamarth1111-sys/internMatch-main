import hashlib
import os
import time

from app.core.config import OTP_EXPIRY_SECONDS


def generate_otp() -> str:
    """Generate a cryptographically random 6-digit OTP."""
    import secrets
    return str(secrets.randbelow(1_000_000)).zfill(6)


def hash_otp(otp: str) -> str:
    """SHA-256 hash the OTP before storing — never store plaintext OTPs."""
    return hashlib.sha256(otp.encode()).hexdigest()


def make_expiry() -> int:
    """Return a Unix timestamp 10 minutes from now."""
    return int(time.time()) + OTP_EXPIRY_SECONDS


def is_expired(expiry_timestamp: int) -> bool:
    return int(time.time()) > expiry_timestamp