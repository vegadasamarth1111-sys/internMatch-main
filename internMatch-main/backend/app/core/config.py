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

# JWT (EdDSA key-pair) 
JWT_ALGORITHM = os.getenv("JWT_ALGORITHM", "EdDSA")
JWT_EXPIRE_SECONDS = int(os.getenv("JWT_EXPIRE_SECONDS", str(60 * 60)))
JWT_REFRESH_EXPIRE_SECONDS = int(os.getenv("JWT_REFRESH_EXPIRE_SECONDS", str(7 * 24 * 60 * 60)))
JWT_PRIVATE_KEY = os.getenv("JWT_PRIVATE_KEY")
JWT_PUBLIC_KEY = os.getenv("JWT_PUBLIC_KEY")

# CORS 
_origins_env = os.getenv("ALLOWED_ORIGINS", "http://localhost:5173")
ALLOWED_ORIGINS: list[str] = [o.strip() for o in _origins_env.split(",")]

# Email (Gmail SMTP) 
GMAIL_USER = os.getenv("GMAIL_USER")
GMAIL_PASS = os.getenv("GMAIL_APP_PASS")

# File uploads 
# Maximum sizes
MAX_UPLOAD_BYTES = int(os.getenv("MAX_UPLOAD_BYTES", str(5 * 1024 * 1024)))   # 5 MB - resumes
MAX_AVATAR_BYTES = int(os.getenv("MAX_AVATAR_BYTES", str(2 * 1024 * 1024)))   # 2 MB - avatars/logos

# Allowed MIME types for images
ALLOWED_IMAGE_TYPES: set[str] = {"image/jpeg", "image/png", "image/webp", "image/gif"}

#  Supabase
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

# Single bucket that holds everything - change this if you split buckets later
SUPABASE_BUCKET = os.getenv("SUPABASE_BUCKET", "internmatch")

# Folder prefixes inside SUPABASE_BUCKET
# Override any of these in .env if you want a different layout
STORAGE_RESUMES_PREFIX  = os.getenv("STORAGE_RESUMES_PREFIX",  "resumes")
STORAGE_AVATARS_PREFIX  = os.getenv("STORAGE_AVATARS_PREFIX",  "avatars")
STORAGE_LOGOS_PREFIX    = os.getenv("STORAGE_LOGOS_PREFIX",    "logos")  

# Salt used when hashing storage paths
STORAGE_HASH_SALT = os.getenv("STORAGE_HASH_SALT")

#  Admin self-registration 
# Generate with: openssl rand -hex 32
# Set to "disabled" after you have created all admin accounts
ADMIN_INVITE_SECRET = os.getenv("ADMIN_INVITE_SECRET", "")