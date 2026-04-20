import hashlib
import mimetypes
from pathlib import Path

from supabase import create_client

from app.core.config import (
    SUPABASE_URL,
    SUPABASE_KEY,
    SUPABASE_BUCKET,
    MAX_UPLOAD_BYTES,
    MAX_AVATAR_BYTES,
    STORAGE_RESUMES_PREFIX,
    STORAGE_AVATARS_PREFIX,
    STORAGE_LOGOS_PREFIX,
    STORAGE_HASH_SALT,
)


class SupabaseClient:
    def __init__(self):
        if not SUPABASE_URL or not SUPABASE_KEY:
            raise Exception("SUPABASE_URL and SUPABASE_KEY not set in .env")
        try:
            self.client = create_client(SUPABASE_URL, SUPABASE_KEY)
            self.bucket = SUPABASE_BUCKET
        except Exception as e:
            raise Exception(f"Failed to initialize Supabase: {str(e)}")

    # Internal helpers 
    def _make_hash(self, domain: str, *ids: int) -> str:
        """
        Produce a deterministic 40-char hex name for a given domain + ID tuple.

        The domain string keeps resume / avatar / logo hashes in separate
        namespaces so user_id=5 never collides across domains.

        The salt makes the resulting path unguessable even if an attacker
        knows the user or internship IDs.

        Same inputs -> same output every time, so uploading again just
        overwrites the existing file with no listing or deleting needed.

        WARNING: never change STORAGE_HASH_SALT after files are in storage.
        """
        raw = f"{domain}:" + ":".join(str(i) for i in ids) + f":{STORAGE_HASH_SALT}"
        return hashlib.sha256(raw.encode()).hexdigest()[:40]

    def _upload(self, storage_path: str, content: bytes, content_type: str | None) -> str:
        """Upload bytes to storage_path in the configured bucket. Returns the storage path."""
        self.client.storage.from_(self.bucket).upload(
            storage_path,
            content,
            file_options={
                "upsert": "true",
                "content-type": content_type or "application/octet-stream",
            },
        )
        return storage_path

    def get_public_url(self, storage_path: str) -> str:
        """Return the public URL for a given storage path."""
        return self.client.storage.from_(self.bucket).get_public_url(storage_path)

    # Resumes
    def upload_resume(
        self,
        user_id: int,
        internship_id: int,
        file_content: bytes,
        filename: str,
    ) -> str:
        """
        Upload a resume for a (user, internship) pair.

        Path: {STORAGE_RESUMES_PREFIX}/{hash(user_id, internship_id)}.ext

        The hash is deterministic, so re-uploading silently overwrites the
        previous file - no listing or deleting needed, no accumulation.
        Exactly one resume is ever stored per user per internship.

        Returns the storage path (store in DB; use get_public_url() for a URL).
        """
        if len(file_content) > MAX_UPLOAD_BYTES:
            raise ValueError("File exceeds 5 MB limit")

        ext = Path(filename).suffix.lower() or ".pdf"
        content_type = mimetypes.types_map.get(ext)
        name = self._make_hash("resume", user_id, internship_id)
        storage_path = f"{STORAGE_RESUMES_PREFIX}/{name}{ext}"

        try:
            return self._upload(storage_path, file_content, content_type)
        except Exception as e:
            raise Exception(f"Resume upload failed: {str(e)}")

    def delete_resume(self, storage_path: str) -> bool:
        """Delete a resume by its full storage path."""
        try:
            self.client.storage.from_(self.bucket).remove([storage_path])
            return True
        except Exception:
            return False

    # Avatars (profile pictures - both applicants and recruiters)
    def upload_avatar(
        self,
        user_id: int,
        file_content: bytes,
        filename: str,
        content_type: str,
    ) -> str:
        """
        Upload a profile picture for any user.

        Path: {STORAGE_AVATARS_PREFIX}/{hash(user_id)}.ext

        Re-uploading overwrites the previous avatar in-place.
        Returns the public URL (store directly in avatar_url column).
        """
        if len(file_content) > MAX_AVATAR_BYTES:
            raise ValueError("Avatar exceeds 2 MB limit")

        ext = Path(filename).suffix.lower() or ".jpg"
        name = self._make_hash("avatar", user_id)
        storage_path = f"{STORAGE_AVATARS_PREFIX}/{name}{ext}"

        try:
            self._upload(storage_path, file_content, content_type)
            return self.get_public_url(storage_path)
        except Exception as e:
            raise Exception(f"Avatar upload failed: {str(e)}")

    # Company logos (recruiters only)
    def upload_logo(
        self,
        user_id: int,
        file_content: bytes,
        filename: str,
        content_type: str,
    ) -> str:
        """
        Upload a company logo for a recruiter.

        Path: {STORAGE_LOGOS_PREFIX}/{hash(user_id)}.ext

        Re-uploading overwrites the previous logo in-place.
        Returns the public URL (store directly in company_logo_url column).
        """
        if len(file_content) > MAX_AVATAR_BYTES:
            raise ValueError("Logo exceeds 2 MB limit")

        ext = Path(filename).suffix.lower() or ".png"
        name = self._make_hash("logo", user_id)
        storage_path = f"{STORAGE_LOGOS_PREFIX}/{name}{ext}"

        try:
            self._upload(storage_path, file_content, content_type)
            return self.get_public_url(storage_path)
        except Exception as e:
            raise Exception(f"Logo upload failed: {str(e)}")


# Singleton
_client: SupabaseClient | None = None


def get_supabase_client() -> SupabaseClient:
    global _client
    if _client is None:
        _client = SupabaseClient()
    return _client