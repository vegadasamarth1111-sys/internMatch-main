"""
In-memory store for pending registrations and password-reset OTPs.

Each entry expires after 10 minutes. The store is cleaned up lazily
on every write so it never grows unbounded.

Keys:
  "reg:{email}"   -> pending registration
  "reset:{email}" -> pending password reset

Swap for Redis before scaling to multiple backend processes.
"""
import time
from typing import TypedDict
from app.core.config import MAX_OTP_ATTEMPTS


class PendingEntry(TypedDict):
    otp_hash: str
    expiry: int
    attempts: int
    password_hash: str | None
    role: str | None


_store: dict[str, PendingEntry] = {}


def _purge_expired() -> None:
    now = int(time.time())
    expired = [k for k, v in _store.items() if v["expiry"] < now]
    for k in expired:
        del _store[k]


def set_pending(
    key: str,
    otp_hash: str,
    expiry: int,
    password_hash: str | None = None,
    role: str | None = None,
) -> None:
    _purge_expired()
    _store[key] = {
        "otp_hash": otp_hash,
        "expiry": expiry,
        "attempts": 0,
        "password_hash": password_hash,
        "role": role,
    }


def get_pending(key: str) -> PendingEntry | None:
    entry = _store.get(key)
    if entry is None:
        return None
    if int(time.time()) > entry["expiry"]:
        del _store[key]
        return None
    return entry


def increment_attempts(key: str) -> int:
    """
    Increment the wrong-guess counter.
    Returns the new attempt count.
    If MAX_OTP_ATTEMPTS is reached, the entry is deleted.
    """
    entry = _store.get(key)
    if not entry:
        return MAX_OTP_ATTEMPTS 

    entry["attempts"] += 1
    if entry["attempts"] >= MAX_OTP_ATTEMPTS:
        del _store[key]
        return MAX_OTP_ATTEMPTS

    return entry["attempts"]


def delete_pending(key: str) -> None:
    _store.pop(key, None)