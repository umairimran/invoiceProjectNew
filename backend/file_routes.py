from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse
import os
from pathlib import Path
import re

from local_storage import (
    get_local_path,
    read_file,
    file_exists,
    delete_file as local_delete_file,
    list_files as local_list_files,
)

router = APIRouter()


@router.get("/files/serve/{file_path:path}")
async def serve_file(file_path: str, download: bool = False, as_name: str | None = None):
    """
    Serve a file by its relative path (e.g. uploads/jobs/.../file.pdf).
    Used when file_url is /api/files/serve/uploads/...
    """
    try:
        full_path = get_local_path(file_path)
        if not full_path.is_file():
            raise HTTPException(status_code=404, detail="File not found")
        filename = as_name or full_path.name
        return FileResponse(
            path=str(full_path),
            filename=filename if download else None,
            media_type="application/octet-stream",
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error serving file: {str(e)}")


@router.get("/files/{filename}")
async def get_file(filename: str, download: bool = False, as_name: str | None = None):
    """
    Get a file by filename. Files are stored under backend/uploads/.
    """
    try:
        relative_path = None
        if "/" in filename:
            relative_path = f"uploads/{filename}"
            if not file_exists(relative_path):
                relative_path = None
        if not relative_path:
            uuid_pattern = r'^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.[a-zA-Z0-9]+$'
            if re.match(uuid_pattern, filename):
                all_job_files = local_list_files("uploads/jobs/")
                for fi in all_job_files:
                    if fi["filename"] == filename:
                        relative_path = fi["key"]
                        break
            else:
                document_types = [
                    "agency_invoice", "approved_quotation", "job_order",
                    "timesheet", "third_party", "proof_screenshot", "tracker",
                    "rate_card", "media_plan_planned", "media_plan_actualized",
                    "appearance_proof", "performance_proof"
                ]
                for doc_type in document_types:
                    candidate = f"uploads/{doc_type}/{filename}"
                    if file_exists(candidate):
                        relative_path = candidate
                        break
        if not relative_path:
            raise HTTPException(status_code=404, detail="File not found")
        full_path = get_local_path(relative_path)
        return FileResponse(
            path=str(full_path),
            filename=(as_name or filename) if download else None,
            media_type="application/octet-stream",
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error retrieving file: {str(e)}")


@router.get("/files/job/{job_id}/{filename}")
async def get_job_file(job_id: str, filename: str, download: bool = False, as_name: str | None = None):
    """Get a job document file by job ID and filename."""
    try:
        job_files = local_list_files(f"uploads/jobs/{job_id}/")
        relative_path = None
        for fi in job_files:
            if fi["filename"] == filename:
                relative_path = fi["key"]
                break
        if not relative_path:
            raise HTTPException(status_code=404, detail="File not found")
        full_path = get_local_path(relative_path)
        return FileResponse(
            path=str(full_path),
            filename=(as_name or filename) if download else None,
            media_type="application/octet-stream",
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error retrieving job file: {str(e)}")


@router.get("/files/check/{document_type}/{entity_id}")
async def check_files(document_type: str, entity_id: str):
    """Check if files exist for a specific document type and entity."""
    valid_document_types = [
        "agency_invoice", "approved_quotation", "job_order",
        "timesheet", "third_party", "proof_screenshot", "tracker",
        "rate_card", "media_plan_planned", "media_plan_actualized", "appearance_proof"
    ]
    if document_type not in valid_document_types:
        raise HTTPException(status_code=400, detail="Invalid document type")
    try:
        prefix = f"uploads/{document_type}/"
        all_files = local_list_files(prefix)
        pattern = f"{entity_id}_{document_type}_"
        matching_files = [f for f in all_files if f["filename"].startswith(pattern)]
        file_details = []
        for fi in matching_files:
            lm = fi.get("last_modified")
            ts = lm.timestamp() if hasattr(lm, "timestamp") else 0
            file_details.append({
                "filename": fi["filename"],
                "size": fi["size"],
                "size_mb": round(fi["size"] / 1024 / 1024, 2),
                "modified_time": ts,
                "extension": os.path.splitext(fi["filename"])[1].lower()
            })
        return {
            "files": [f["filename"] for f in matching_files],
            "file_details": file_details
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error checking files: {str(e)}")


@router.delete("/files/{document_type}/{entity_id}/{filename}")
async def delete_file(document_type: str, entity_id: str, filename: str):
    """Delete a specific file for a document type and entity."""
    valid_document_types = [
        "agency_invoice", "approved_quotation", "job_order",
        "timesheet", "third_party", "proof_screenshot", "tracker",
        "rate_card", "media_plan_planned", "media_plan_actualized", "appearance_proof"
    ]
    if document_type not in valid_document_types:
        raise HTTPException(status_code=400, detail="Invalid document type")
    expected_pattern = f"{entity_id}_{document_type}_"
    if not filename.startswith(expected_pattern):
        raise HTTPException(status_code=403, detail="Access denied: File does not belong to this entity")
    relative_path = f"uploads/{document_type}/{filename}"
    if not file_exists(relative_path):
        raise HTTPException(status_code=404, detail="File not found")
    try:
        local_delete_file(relative_path)
        return {"message": f"File {filename} deleted successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete file: {str(e)}")
