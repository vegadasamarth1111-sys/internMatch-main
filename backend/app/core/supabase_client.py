import mimetypes
from pathlib import Path

from supabase import create_client
from app.core.config import SUPABASE_URL, SUPABASE_KEY, SUPABASE_BUCKET, MAX_UPLOAD_BYTES


class SupabaseClient:
    def __init__(self):
        if not SUPABASE_URL or not SUPABASE_KEY:
            raise Exception("SUPABASE_URL and SUPABASE_KEY not set in .env")
        try:
            self.client = create_client(SUPABASE_URL, SUPABASE_KEY)
            self.bucket = SUPABASE_BUCKET
        except Exception as e:
            raise Exception(f"Failed to initialize Supabase: {str(e)}")

    def upload_resume(self, user_id: int, internship_id: int, file_content: bytes, filename: str) -> str:
        """
        Upload resume to user_{id}/internship_{id}/resume.ext
        Deletes any existing file in that folder first so only one resume
        is ever stored per user per internship.
        Returns the full storage path (used to build the public URL later).
        """
        if len(file_content) > MAX_UPLOAD_BYTES:
            raise ValueError("File exceeds 5 MB limit")

        ext = Path(filename).suffix.lower()
        content_type = mimetypes.types_map.get(ext)

        folder = f"user_{user_id}/internship_{internship_id}"
        storage_path = f"{folder}/resume{ext}"

        # Delete whatever is already in that folder so we never accumulate files
        try:
            existing = self.client.storage.from_(self.bucket).list(folder)
            if existing:
                old_paths = [f"{folder}/{f['name']}" for f in existing]
                self.client.storage.from_(self.bucket).remove(old_paths)
        except Exception:
            pass  # If listing/deleting fails, still attempt the upload

        try:
            self.client.storage.from_(self.bucket).upload(
                storage_path,
                file_content,
                file_options={
                    "upsert": "true",
                    "content-type": content_type,
                },
            )
            return storage_path  # e.g. "user_2/internship_1/resume.pdf"
        except Exception as e:
            raise Exception(f"Supabase upload failed: {str(e)}")

    def get_public_url(self, storage_path: str) -> str:
        """Return the public URL for a given storage path."""
        return self.client.storage.from_(self.bucket).get_public_url(storage_path)

    def delete_resume(self, storage_path: str) -> bool:
        """Delete a resume by its full storage path."""
        try:
            self.client.storage.from_(self.bucket).remove([storage_path])
            return True
        except Exception:
            return False


_client = None

def get_supabase_client() -> SupabaseClient:
    global _client
    if _client is None:
        _client = SupabaseClient()
    return _client