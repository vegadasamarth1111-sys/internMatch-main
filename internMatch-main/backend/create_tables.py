from app.database.session import Base, engine

from app.models.user import User
from app.models.applicant_profile import ApplicantProfile
from app.models.recruiter_profile import RecruiterProfile
from app.models.internship import Internship
from app.models.application import Application
from app.models.contact import ContactMessage
from app.models.saved_internship import SavedInternship
from app.models.message import Message

print("Creating database tables...")
Base.metadata.create_all(bind=engine)
print("Done.")