"""
File type validation using magic bytes (file signatures).
Checks the actual binary content of the file, not the client-supplied
content-type header which can be trivially spoofed.
"""

# Magic byte signatures for allowed file types
# Each entry is (offset, bytes) - bytes at that offset must match
_SIGNATURES: list[tuple[int, bytes, str]] = [
    # PDF
    (0, b'%PDF', 'PDF'),
    # ZIP-based formats (docx is a ZIP archive)
    (0, b'PK\x03\x04', 'DOCX/ZIP'),
    # Legacy Word doc (.doc) Compound Document File
    (0, b'\xd0\xcf\x11\xe0\xa1\xb1\x1a\xe1', 'DOC'),
]


def is_valid_resume(content: bytes) -> bool:
    """
    Return True if the file content matches any of the allowed
    resume formats (PDF, DOCX, DOC) based on magic bytes.
    """
    for offset, signature, _ in _SIGNATURES:
        if content[offset: offset + len(signature)] == signature:
            return True
    return False