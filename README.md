# InternMatch

InternMatch is a full-stack web platform that connects students and fresh graduates with internship opportunities. Applicants can build profiles, browse listings, and submit applications with resumes. Recruiters can post internships, review applicants, and manage application statuses.

## Tech Stack

**Backend** — FastAPI, SQLAlchemy, PostgreSQL, PyJWT (EdDSA), Passlib (Argon2), Gmail (OTP email), Supabase (file storage)

**Frontend** — React, TypeScript, Vite, Tailwind CSS, React Router

---

## Project Structure

```
InternMatch/
├── backend/
│   ├── app/
│   │   ├── api/          # Route handlers
│   │   ├── core/         # Config, security (JWT, hashing)
│   │   ├── database/     # SQLAlchemy session
│   │   ├── models/       # Database models
│   │   ├── schemas/      # Pydantic request/response schemas
│   │   └── utils/        # OTP, email, file validation
│   ├── create_tables.py
│   ├── requirements.txt
│   └── .env.example
└── frontend/
    ├── src/
    │   ├── components/   # Navbar, Footer, shared UI
    │   ├── context/      # AuthContext, useAuth
    │   ├── pages/        # All page components
    │   ├── services/     # API client and service modules
    │   └── utils/        # ProtectedRoute, skill helpers
    └── .env.example
```

---

## Prerequisites

- Python 3.10 or higher
- pip
- A database — PostgreSQL is recommended, but SQLite works with no extra setup for local development
- Node.js 18 or higher
- npm
- A Supabase project with a storage bucket (used for resume uploads)
- A Gmail account with an App Password enabled (used for OTP emails)

---

## Backend Setup

### 1. Create and activate a virtual environment

```bash
cd backend
python -m venv .venv
```

On macOS/Linux:
```bash
source .venv/bin/activate
```

On Windows:
```bash
.venv\Scripts\activate
```

### 2. Install dependencies

```bash
pip install -r requirements.txt
```

### 3. Configure environment variables

```bash
cp .env.example .env
```

Open `.env` and fill in your values. See the Environment Variables section below for reference.

### 4. Generate the JWT key pair

Run the following to generate the EdDSA key pair and save them as files:

```bash
python -c "
from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PrivateKey
from cryptography.hazmat.primitives.serialization import (
    Encoding, PrivateFormat, PublicFormat, NoEncryption
)
key = Ed25519PrivateKey.generate()
open('jwt_private.key', 'wb').write(
    key.private_bytes(Encoding.PEM, PrivateFormat.PKCS8, NoEncryption())
)
open('jwt_public.key', 'wb').write(
    key.public_key().public_bytes(Encoding.PEM, PublicFormat.SubjectPublicKeyInfo)
)
print('Keys generated.')
"
```

Copy the contents of `jwt_private.key` and `jwt_public.key` into `JWT_PRIVATE_KEY` and `JWT_PUBLIC_KEY` in your `.env`, keeping the full PEM block including the header and footer lines.

### 5. Set up your database

The backend uses SQLAlchemy, so any supported database works. PostgreSQL is recommended for production use, but SQLite is fine for local development with zero setup.

**PostgreSQL** — Install PostgreSQL and create a database using any tool you prefer (pgAdmin, psql, TablePlus, etc.). Then set your connection string in `.env`:

```env
DATABASE_URL=postgresql://postgres:your_password@localhost:5432/your_db_name
```

**SQLite** — No installation needed. Just point the connection string at a local file:

```env
DATABASE_URL=sqlite:///./internmatch.db
```

### 6. Create the database tables

Once your `DATABASE_URL` is set, run:

```bash
python create_tables.py
```

This will create all the required tables in whichever database you configured.

### 7. Start the backend server

```bash
uvicorn app.main:app --reload
```

The API will be available at `http://localhost:8000`.
Interactive API docs are at `http://localhost:8000/docs`.

---

## Frontend Setup

### 1. Install dependencies

```bash
cd frontend
npm install
```

### 2. Configure environment variables

```bash
cp .env.example .env
```

The `.env.example` already contains `VITE_API_URL=http://localhost:8000` for local development. No changes are needed unless your backend runs on a different port.

### 3. Start the development server

```bash
npm run dev
```

The app will be available at `http://localhost:5173`.

---

## Running the Full Project Locally

Open two terminal windows.

Terminal 1 - Backend:
```bash
cd backend
source .venv/bin/activate   # Windows: .venv\Scripts\activate
uvicorn app.main:app --reload
```

Terminal 2 - Frontend:
```bash
cd frontend
npm run dev
```

---

## Environment Variables

### Backend (`backend/.env`)

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `DATABASE_URL` | Yes | - | PostgreSQL connection string |
| `ALLOWED_ORIGINS` | No | `http://localhost:5173` | Comma-separated list of allowed frontend origins |
| `JWT_ALGORITHM` | No | `EdDSA` | JWT signing algorithm, must use an asymmetric key pair |
| `JWT_PRIVATE_KEY` | Yes | - | PEM-encoded private key for signing JWTs |
| `JWT_PUBLIC_KEY` | Yes | - | PEM-encoded public key for verifying JWTs |
| `JWT_EXPIRE_SECONDS` | No | `3600` | Access token lifetime in seconds |
| `JWT_REFRESH_EXPIRE_SECONDS` | No | `604800` | Refresh token lifetime in seconds |
| `MAX_OTP_ATTEMPTS` | No | `5` | Maximum OTP verification attempts |
| `OTP_EXPIRY_SECONDS` | No | `600` | OTP validity duration in seconds |
| `GMAIL_USER` | Yes | - | Gmail address used to send OTP emails |
| `GMAIL_APP_PASS` | Yes | - | 16-digit Gmail App Password |
| `MAX_UPLOAD_BYTES` | No | `5242880` | Maximum resume file size in bytes (default 5 MB) |
| `SUPABASE_URL` | Yes | - | Supabase project data API URL |
| `SUPABASE_KEY` | Yes | - | Supabase API key |
| `SUPABASE_BUCKET` | Yes | - | Supabase storage bucket name for resumes |

### Frontend (`frontend/.env`)

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `VITE_API_URL` | No | `http://localhost:8000` | Backend API base URL |

---

## API Overview

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/` | None | Health check |
| POST | `/auth/register` | None | Step 1 of registration — sends OTP to email |
| POST | `/auth/verify-otp` | None | Step 2 — verifies OTP and creates account |
| POST | `/auth/resend-otp` | None | Resend OTP for registration or password reset |
| POST | `/auth/login` | None | Login, returns access and refresh tokens |
| POST | `/auth/refresh` | None | Refresh access token |
| POST | `/auth/forgot-password` | None | Send password reset OTP |
| POST | `/auth/reset-password` | None | Verify OTP and set new password |
| GET | `/users/me` | JWT | Get current user info |
| DELETE | `/users/me` | JWT | Delete own account |
| POST | `/users/me/change-password` | JWT | Change account password |
| GET | `/applicant/profile` | JWT (applicant) | Get own applicant profile |
| PUT | `/applicant/profile` | JWT (applicant) | Update own applicant profile |
| DELETE | `/applicant/profile` | JWT (applicant) | Soft-delete own applicant profile |
| GET | `/applicant/profile/{user_id}` | JWT (recruiter) | View an applicant's profile by user ID |
| GET | `/recruiter/profile` | JWT (recruiter) | Get own recruiter profile |
| PUT | `/recruiter/profile` | JWT (recruiter) | Update own recruiter profile |
| GET | `/internships` | None | List active internships with filters |
| POST | `/internships` | JWT (recruiter) | Create a new internship posting |
| GET | `/internships/mine` | JWT (recruiter) | List own internship postings |
| GET | `/internships/{id}` | None | Get a single internship by ID |
| PUT | `/internships/{id}` | JWT (recruiter) | Update an internship posting |
| DELETE | `/internships/{id}` | JWT (recruiter) | Soft-delete an internship posting |
| POST | `/applications` | JWT (applicant) | Apply for an internship |
| GET | `/applications/mine` | JWT (applicant) | List own applications |
| GET | `/applications/internship/{id}` | JWT (recruiter) | List all applicants for a posting |
| GET | `/applications/{id}` | JWT | Get a single application |
| PATCH | `/applications/{id}/status` | JWT | Update application status (accept / reject / withdraw) |
| POST | `/applications/{id}/resume` | JWT (applicant) | Upload a resume for an application |
| POST | `/contact` | None | Submit a contact message |#   i n t e r n M a t c h - m a i n 
 
 