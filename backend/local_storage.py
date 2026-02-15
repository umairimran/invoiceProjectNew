"""
Local file storage for uploads. All files are stored under backend/uploads/
using the same path convention as before (e.g. uploads/jobs/{job_id}/{folder_type}/...).
"""
import os
import uuid
from pathlib import Path
from typing import List, Dict, Any, Optional

# Base directory: backend folder. Paths like "uploads/jobs/..." resolve to backend/uploads/jobs/...
BACKEND_DIR = Path(os.path.dirname(os.path.abspath(__file__)))


def get_local_path(relative_path: str) -> Path:
    """Convert a relative path (e.g. uploads/jobs/.../file.pdf) to absolute path under backend."""
    normalized = os.path.normpath(relative_path)
    if normalized.startswith("..") or os.path.isabs(normalized):
        raise ValueError(f"Invalid path: {relative_path}")
    return BACKEND_DIR / normalized


def ensure_upload_dir(relative_path: str) -> Path:
    """Ensure the directory for the given relative path exists; return full path."""
    full = get_local_path(relative_path)
    full.parent.mkdir(parents=True, exist_ok=True)
    return full


def save_file(relative_path: str, content: bytes, content_type: Optional[str] = None) -> Dict[str, Any]:
    """Save file to local uploads. relative_path e.g. uploads/jobs/{job_id}/{folder_type}/{filename}."""
    full_path = ensure_upload_dir(relative_path)
    full_path.write_bytes(content)
    size = len(content)
    return {
        "s3_key": relative_path,
        "file_path": relative_path,
        "file_url": f"/api/files/serve/{relative_path}",
        "size": size,
    }


def read_file(relative_path: str) -> bytes:
    """Read file content from local uploads."""
    full_path = get_local_path(relative_path)
    if not full_path.is_file():
        raise FileNotFoundError(f"File not found: {relative_path}")
    return full_path.read_bytes()


def file_exists(relative_path: str) -> bool:
    """Check if a file exists at the given relative path."""
    full_path = get_local_path(relative_path)
    return full_path.is_file()


def delete_file(relative_path: str) -> bool:
    """Delete a file. Returns True if deleted or didn't exist."""
    full_path = get_local_path(relative_path)
    if full_path.is_file():
        full_path.unlink()
        return True
    return False


def list_files(prefix: str) -> List[Dict[str, Any]]:
    """List files under a prefix (e.g. uploads/jobs/). Returns list of {key, filename, size, last_modified}."""
    dir_path = get_local_path(prefix.rstrip("/"))
    if not dir_path.is_dir():
        return []
    result = []
    for f in dir_path.rglob("*"):
        if f.is_file():
            rel = f.relative_to(BACKEND_DIR)
            key = str(rel).replace("\\", "/")
            stat = f.stat()
            result.append({
                "key": key,
                "filename": f.name,
                "size": stat.st_size,
                "last_modified": datetime_from_timestamp(stat.st_mtime),
            })
    return result


def datetime_from_timestamp(ts: float):
    """Return a datetime-like object for last_modified (for compatibility)."""
    from datetime import datetime
    return datetime.utcfromtimestamp(ts)


def generate_job_file_path(job_id: str, folder_type: str, filename: str) -> str:
    """Generate a unique relative path for a job document (same shape as S3 key)."""
    ext = os.path.splitext(filename)[1]
    unique_name = f"{uuid.uuid4()}{ext}"
    return f"uploads/jobs/{job_id}/{folder_type}/{unique_name}"


def generate_document_file_path(document_type: str, entity_id: str, filename: str) -> str:
    """Generate a unique relative path for a document (same shape as S3 key)."""
    from datetime import datetime, timezone
    ts = int(datetime.now(timezone.utc).timestamp())
    return f"uploads/{document_type}/{entity_id}_{document_type}_{ts}_{filename}"
