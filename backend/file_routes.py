from fastapi import APIRouter, HTTPException, Response
from fastapi.responses import FileResponse
import os
from pathlib import Path

router = APIRouter()

UPLOAD_DIR = Path("uploads")

@router.get("/files/{filename}")
async def get_file(filename: str, download: bool = False, as_name: str | None = None):
    """
    Get a file by filename. If download is True, return as an attachment.
    """
    # First, look for the file directly in uploads directory
    file_path = UPLOAD_DIR / filename
    if not file_path.is_file():
        # If not found, search in subdirectories
        for subdir in UPLOAD_DIR.glob("**/"):
            check_path = subdir / filename
            if check_path.is_file():
                file_path = check_path
                break
        else:
            # Not found anywhere
            raise HTTPException(status_code=404, detail="File not found")
    
    return FileResponse(
        path=file_path,
        media_type="application/octet-stream",
        filename=as_name or filename,
        # If download=True, force download as attachment
        content_disposition_type="attachment" if download else "inline"
    )

@router.get("/files/check/{document_type}/{entity_id}")
async def check_files(document_type: str, entity_id: str):
    """
    Check if files exist for a specific document type and entity
    Returns a list of file paths that match the pattern
    """
    # Validate document_type
    valid_document_types = [
        # Core agency document folders
        "agency_invoice", "approved_quotation", "job_order", 
        "timesheet", "third_party", "proof_screenshot", "tracker",
        # Added support for rate cards (clients/agencies)
        "rate_card",
        # Backwards compatibility with older names
        "media_plan_planned", "media_plan_actualized", "appearance_proof"
    ]
    
    if document_type not in valid_document_types:
        raise HTTPException(status_code=400, detail=f"Invalid document type")
    
    # Create directory pattern to search
    dir_path = UPLOAD_DIR / document_type
    if not dir_path.exists():
        return {"files": []}
    
    # Find all files that match the pattern entity_id_document_type_*
    pattern = f"{entity_id}_{document_type}_*"
    files = list(dir_path.glob(pattern))
    
    # Get detailed file information
    file_details = []
    for file_path in files:
        if file_path.is_file():
            stat = file_path.stat()
            file_details.append({
                "filename": file_path.name,
                "size": stat.st_size,
                "size_mb": round(stat.st_size / 1024 / 1024, 2),
                "modified_time": stat.st_mtime,
                "extension": file_path.suffix.lower()
            })
    
    return {
        "files": [file.name for file in files],  # Keep backward compatibility
        "file_details": file_details
    }

@router.delete("/files/{document_type}/{entity_id}/{filename}")
async def delete_file(document_type: str, entity_id: str, filename: str):
    """
    Delete a specific file for a document type and entity
    """
    # Validate document_type
    valid_document_types = [
        # Core agency document folders
        "agency_invoice", "approved_quotation", "job_order", 
        "timesheet", "third_party", "proof_screenshot", "tracker",
        # Added support for rate cards (clients/agencies)
        "rate_card",
        # Backwards compatibility with older names
        "media_plan_planned", "media_plan_actualized", "appearance_proof"
    ]
    
    if document_type not in valid_document_types:
        raise HTTPException(status_code=400, detail=f"Invalid document type")
    
    # Construct the file path
    file_path = UPLOAD_DIR / document_type / filename
    
    # Check if file exists
    if not file_path.is_file():
        raise HTTPException(status_code=404, detail="File not found")
    
    # Verify the filename matches the expected pattern for this entity and document type
    expected_pattern = f"{entity_id}_{document_type}_"
    if not filename.startswith(expected_pattern):
        raise HTTPException(status_code=403, detail="Access denied: File does not belong to this entity")
    
    try:
        # Delete the file
        file_path.unlink()
        return {"message": f"File {filename} deleted successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete file: {str(e)}")
