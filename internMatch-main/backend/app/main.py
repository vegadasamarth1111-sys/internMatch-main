from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

from app.core.config import ALLOWED_ORIGINS
from app.core.limiter import limiter
from app.api.auth import router as auth_router
from app.api.users import router as user_router
from app.api.applicant_profile import router as applicant_profile_router
from app.api.recruiter_profile import router as recruiter_profile_router, public_router as company_router
from app.api.internship import router as internship_router
from app.api.application import router as application_router
from app.api.contact import router as contact_router
from app.api.saved_internship import router as saved_router
from app.api.chat import router as chat_router
from app.api.admin import router as admin_router

def create_app() -> FastAPI:
    app = FastAPI(
        title="InternMatch API",
        version="1.0.0",
        description="Backend API for the InternMatch platform",
    )

    # Rate limiting
    app.state.limiter = limiter
    app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

    # CORS
    app.add_middleware(
        CORSMiddleware,
        allow_origins=ALLOWED_ORIGINS,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Security headers
    @app.middleware("http")
    async def add_security_headers(request: Request, call_next):
        response: Response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Permissions-Policy"] = "geolocation=(), microphone=(), camera=()"
        # Only send HSTS over HTTPS - skip on localhost
        if request.url.scheme == "https":
            response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
        return response

    # Routers
    app.include_router(auth_router)
    app.include_router(user_router)
    app.include_router(applicant_profile_router)
    app.include_router(recruiter_profile_router)
    app.include_router(company_router)
    app.include_router(internship_router)
    app.include_router(application_router)
    app.include_router(contact_router)
    app.include_router(saved_router)
    app.include_router(chat_router)
    app.include_router(admin_router)

    @app.get("/", tags=["Health"])
    def health_check() -> dict[str, str]:
        return {"status": "ok"}

    return app

app = create_app()