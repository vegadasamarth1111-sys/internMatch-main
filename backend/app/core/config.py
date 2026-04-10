import os
from pathlib import Path
from dotenv import load_dotenv

# Load .env file before reading any env vars
BASE_DIR = Path(__file__).resolve().parent.parent.parent
load_dotenv(BASE_DIR / ".env")

# Database
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://user:pass@localhost/test")

# OTP
MAX_OTP_ATTEMPTS = int(os.getenv("MAX_OTP_ATTEMPTS", 5))
OTP_EXPIRY_SECONDS = int(os.getenv("OTP_EXPIRY_SECONDS", 600))

# JWT (EdDSA key-pair - files must exist)
JWT_ALGORITHM = os.getenv("JWT_ALGORITHM", "EdDSA")
JWT_EXPIRE_SECONDS = int(os.getenv("JWT_EXPIRE_SECONDS", str(60 * 60)))
JWT_REFRESH_EXPIRE_SECONDS = int(os.getenv("JWT_REFRESH_EXPIRE_SECONDS", str(7 * 24 * 60 * 60)))
JWT_PRIVATE_KEY = os.getenv("JWT_PRIVATE_KEY")
JWT_PUBLIC_KEY = os.getenv("JWT_PUBLIC_KEY")

# CORS
_origins_env = os.getenv("ALLOWED_ORIGINS", "http://localhost:5173")
ALLOWED_ORIGINS: list[str] = [o.strip() for o in _origins_env.split(",")]

# Gmail  and pass key to send emails from
GMAIL_USER = os.getenv("GMAIL_USER")
GMAIL_PASS = os.getenv("GMAIL_APP_PASS")

# File uploads SUPABASE CONFIG
MAX_UPLOAD_BYTES = 5 * 1024 * 1024
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")
SUPABASE_BUCKET = os.getenv("SUPABASE_BUCKET", "resumes")

__all__ = [
    "DATABASE_URL",
    "JWT_ALGORITHM",
    "JWT_EXPIRE_SECONDS",
    "JWT_PRIVATE_KEY",
    "JWT_PUBLIC_KEY",
    "ALLOWED_ORIGINS",
    "MAX_UPLOAD_BYTES",
    "GMAIL_USER",
    "GMAIL_PASS",
    "SUPABASE_URL",
    "SUPABASE_KEY",
    "SUPABASE_BUCKET",
]