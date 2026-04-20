from typing import Any, Iterable, Tuple

from app.models.applicant_profile import ApplicantProfile
from app.models.recruiter_profile import RecruiterProfile

APPLICANT_PROFILE_FIELDS: tuple[str, ...] = (
    "first_name",
    "last_name",
    "dob",
    "gender",
    "city",
    "state",
    "country",
    "phone",
    "education_level",
    "degree_name",
    "university_name",
    "graduation_year",
    "gpa",
    "skills",
    "bio",
    "languages_spoken",
    "hobbies",
    "avatar_url",
)

RECRUITER_PROFILE_FIELDS: tuple[str, ...] = (
    "first_name",
    "last_name",
    "gender",
    "company_name",
    "job_title",
    "department",
    "bio",
    "phone_number",
    "avatar_url"
)


def _is_filled(value: Any) -> bool:
    if value is None:
        return False
    if isinstance(value, str):
        return bool(value.strip())
    if isinstance(value, (list, tuple, set)):
        return len(value) > 0
    return True


def _calculate(fields: Iterable[str], profile: Any) -> Tuple[int, bool]:
    total = len(fields)
    filled = sum(
        1 for field in fields if _is_filled(getattr(profile, field, None))
    )
    percentage = int((filled / total) * 100) if total else 0
    completed = percentage == 100
    return percentage, completed


def calculate_profile_completion(profile: Any) -> Tuple[int, bool]:
    if isinstance(profile, ApplicantProfile):
        return _calculate(APPLICANT_PROFILE_FIELDS, profile)
    if isinstance(profile, RecruiterProfile):
        return _calculate(RECRUITER_PROFILE_FIELDS, profile)
    raise TypeError("Unsupported profile type")