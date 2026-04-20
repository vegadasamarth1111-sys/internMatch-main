# InternMatch

InternMatch is a full-stack web platform that connects students and fresh graduates with internship opportunities. Applicants can build profiles, browse listings, and submit applications with resumes. Recruiters can post internships, review applicants, and manage application statuses.

## Tech Stack

**Backend** - FastAPI, SQLAlchemy, PostgreSQL, PyJWT (EdDSA), Passlib (Argon2), Gmail (OTP email), Supabase (file storage), SlowAPI (rate limiting)

**Frontend** - React, TypeScript, Vite, Tailwind CSS, React Router

---

## Project Structure

```
InternMatch/
├── backend/
│   ├── app/
│   │   ├── api/          # Route handlers
│   │   ├── core/         # Config, security (JWT, hashing), rate limiter, Supabase client
│   │   ├── database/     # SQLAlchemy session
│   │   ├── models/       # Database models
│   │   ├── schemas/      # Pydantic request/response schemas
│   │   └── utils/        # OTP, email, file validation, profile completion
│   ├── create_tables.py
│   ├── requirements.txt
│   └── .env.example
└── frontend/
    ├── public/
    │   └── sw.js         # Service worker (PWA offline support)
    ├── src/
    │   ├── components/   # Navbar, Footer, shared UI, ChatModal, ApplyModal
    │   ├── context/      # AuthContext, useAuth, ToastContext
    │   ├── pages/        # All page components
    │   ├── services/     # API client and service modules
    │   └── utils/        # ProtectedRoute, skill helpers
    └── .env.example
```

---

## Prerequisites

- Python 3.10 or higher
- pip
- A database - PostgreSQL is recommended, but SQLite works with no extra setup for local development
- Node.js 18 or higher
- npm
- A Supabase project with a storage bucket (used for resume uploads, profile pictures, and company logos)
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
| `MAX_AVATAR_BYTES` | No | `5242880` | Maximum profile picture / logo file size in bytes (default 5 MB) |
| `SUPABASE_URL` | Yes | - | Supabase project data API URL |
| `SUPABASE_KEY` | Yes | - | Supabase API key |
| `SUPABASE_BUCKET` | Yes | - | Supabase storage bucket name (holds resumes, avatars, and logos) |
| `STORAGE_RESUMES_PREFIX` | No | `resumes` | Folder prefix inside the bucket for resumes |
| `STORAGE_AVATARS_PREFIX` | No | `avatars` | Folder prefix inside the bucket for profile pictures |
| `STORAGE_LOGOS_PREFIX` | No | `logos` | Folder prefix inside the bucket for company logos |
| `ADMIN_INVITE_SECRET` | No | - | Secret used by the `/admin/register` endpoint to create admin accounts. Generate with `openssl rand -hex 32`. Set to `disabled` once all admin accounts are created. |

### Frontend (`frontend/.env`)

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `VITE_API_URL` | No | `http://localhost:8000` | Backend API base URL |

---

## Supabase Storage Setup

The platform uses a **single Supabase bucket** for all file uploads. Inside that bucket, files are organised into three folders: `resumes/`, `avatars/`, and `logos/`. You can change the folder names via the `STORAGE_*_PREFIX` env vars.

To set it up:
1. Create a new bucket in your Supabase dashboard (e.g. `internmatch`).
2. Make the bucket **public** so uploaded files can be served directly as URLs.
3. Set `SUPABASE_BUCKET=internmatch` (or whatever you named it) in your `.env`.

---

## Admin Accounts

Admin accounts have access to the admin dashboard where they can view platform stats, manage users (ban/unban), and manage internship listings.

To create the first admin account:

1. Set `ADMIN_INVITE_SECRET` to a strong random string in your `.env` (generate one with `openssl rand -hex 32`).
2. Navigate to `/admin/register` in the frontend, or POST to `/admin/register` directly, and supply the invite secret along with the email and password.
3. Once all admin accounts are created, set `ADMIN_INVITE_SECRET=disabled` to close the endpoint.

Admin accounts use the `recruiter` role internally but have the `is_admin` flag set, which unlocks the admin dashboard in the UI.

---

## Features Overview

### Applicants
- Register with OTP email verification, build a profile with skills, education, links, and a profile picture.
- Browse and search internship listings, save listings for later.
- Search saved internships by title directly from the dashboard.
- Apply with a cover letter and resume (PDF/DOCX upload).
- Track application statuses with title search, and chat with the recruiter directly from the application page.

### Recruiters
- Build a recruiter profile with a personal avatar and company logo.
- Post, edit, and manage internship listings (including stipend amounts in INR).
- Search own listings by title from the recruiter dashboard.
- View all applicants for a listing, search applicants by name or email, and accept, reject, or move applications.
- Chat with applicants directly from the application page.
- A public company profile page (`/company/:id`) is automatically available once a recruiter profile is set up.

### Admin
- Access the admin dashboard at `/admin` (requires `is_admin` flag).
- View platform-wide stats (total users, internships, applications).
- Browse and search all users by email/role, or look up a specific user by ID — ban or unban accounts.
- Browse and search all internship listings by title or ID, filter by status (active, inactive, deleted), toggle active status, or remove listings.

### General
- Profile completion percentage tracked and displayed for both applicants and recruiters.
- Rate limiting on sensitive endpoints (login, password change, etc.) via SlowAPI.
- PWA-ready: a service worker (`public/sw.js`) enables basic offline support.
- Toast notification system for feedback across the UI.

---

## API Overview

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/` | None | Health check |
| POST | `/auth/register` | None | Step 1 of registration - sends OTP to email |
| POST | `/auth/verify-otp` | None | Step 2 - verifies OTP and creates account |
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
| POST | `/applicant/profile/avatar` | JWT (applicant) | Upload profile picture |
| DELETE | `/applicant/profile` | JWT (applicant) | Soft-delete own applicant profile |
| GET | `/applicant/profile/{user_id}` | JWT (recruiter) | View an applicant's profile by user ID |
| GET | `/recruiter/profile` | JWT (recruiter) | Get own recruiter profile |
| PUT | `/recruiter/profile` | JWT (recruiter) | Update own recruiter profile |
| POST | `/recruiter/profile/avatar` | JWT (recruiter) | Upload recruiter profile picture |
| POST | `/recruiter/profile/logo` | JWT (recruiter) | Upload company logo |
| GET | `/company/{user_id}` | None | Public company profile page data |
| GET | `/internships` | None | List active internships with filters |
| POST | `/internships` | JWT (recruiter) | Create a new internship posting |
| GET | `/internships/mine` | JWT (recruiter) | List own internship postings; supports `search` query param |
| GET | `/internships/{id}` | None | Get a single internship by ID |
| PUT | `/internships/{id}` | JWT (recruiter) | Update an internship posting |
| DELETE | `/internships/{id}` | JWT (recruiter) | Soft-delete an internship posting |
| POST | `/applications` | JWT (applicant) | Apply for an internship |
| GET | `/applications/mine` | JWT (applicant) | List own applications; supports `search` (internship title) query param |
| GET | `/applications/internship/{id}` | JWT (recruiter) | List all applicants for a posting; supports `search` (name/email) query param |
| GET | `/applications/{id}` | JWT | Get a single application |
| PATCH | `/applications/{id}/status` | JWT | Update application status (accept / reject / withdraw) |
| POST | `/applications/{id}/resume` | JWT (applicant) | Upload a resume for an application |
| GET | `/chat/{application_id}` | JWT | Get messages for an application |
| POST | `/chat/{application_id}` | JWT | Send a message for an application |
| GET | `/saved` | JWT (applicant) | List saved internships; supports `search` (title) query param |
| POST | `/saved` | JWT (applicant) | Save an internship |
| DELETE | `/saved/{internship_id}` | JWT (applicant) | Remove a saved internship |
| GET | `/saved/ids` | JWT (applicant) | Get IDs of all saved internships |
| POST | `/admin/register` | None (invite secret) | Create an admin account |
| GET | `/admin/stats` | JWT (admin) | Platform-wide statistics |
| GET | `/admin/users` | JWT (admin) | List/search users; supports `search`, `role`, and `user_id` query params |
| PATCH | `/admin/users/{user_id}/ban` | JWT (admin) | Ban a user |
| PATCH | `/admin/users/{user_id}/unban` | JWT (admin) | Unban a user |
| GET | `/admin/internships` | JWT (admin) | List/search internships; supports `search`, `internship_id`, `status`, and `include_deleted` query params |
| DELETE | `/admin/internships/{id}` | JWT (admin) | Remove an internship |
| PATCH | `/admin/internships/{id}/toggle` | JWT (admin) | Toggle internship active status |
| POST | `/contact` | None | Submit a contact message |