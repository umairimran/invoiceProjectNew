from fastapi import APIRouter, HTTPException, Response
from fastapi.responses import RedirectResponse
import os
from pathlib import Path
from s3_service import get_s3_service
import re

router = APIRouter()

UPLOAD_DIR = Path("uploads")

@router.get("/files/{filename}")
async def get_file(filename: str, download: bool = False, as_name: str | None = None):
    """
    Get a file by filename. If download is True, return as an attachment.
    Now works with S3 storage.
    """
    try:
        s3_service = get_s3_service()
        
        # First, try to find the file in S3 by searching common prefixes
        s3_key = None
        
        # Check if filename already contains a path (for backward compatibility)
        if "/" in filename:
            s3_key = f"uploads/{filename}"
        else:
            # Check if this is a UUID-based filename (job documents)
            import re
            uuid_pattern = r'^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.[a-zA-Z0-9]+$'
            if re.match(uuid_pattern, filename):
                # This is a job document with UUID filename, search in jobs directory
                jobs_files = await s3_service.list_files("uploads/jobs/")
                for file_info in jobs_files:
                    if file_info["filename"] == filename:
                        s3_key = file_info["key"]
                        break
            else:
                # Search in common document type directories
                document_types = [
                    "agency_invoice", "approved_quotation", "job_order", 
                    "timesheet", "third_party", "proof_screenshot", "tracker",
                    "rate_card", "media_plan_planned", "media_plan_actualized", 
                    "appearance_proof", "performance_proof"
                ]
                
                for doc_type in document_types:
                    # Check direct path
                    potential_key = f"uploads/{doc_type}/{filename}"
                    if await s3_service.file_exists(potential_key):
                        s3_key = potential_key
                        break
        
        if not s3_key:
            raise HTTPException(status_code=404, detail="File not found")
        
        # Generate presigned URL for file access
        presigned_url = s3_service.generate_presigned_url(s3_key, expiration=3600)
        
        # If download is requested, add appropriate headers
        if download:
            return RedirectResponse(
                url=presigned_url,
                status_code=302,
                headers={
                    "Content-Disposition": f"attachment; filename={as_name or filename}"
                }
            )
        else:
            return RedirectResponse(url=presigned_url, status_code=302)
            
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error retrieving file: {str(e)}")

@router.get("/files/job/{job_id}/{filename}")
async def get_job_file(job_id: str, filename: str, download: bool = False, as_name: str | None = None):
    """
    Get a job document file by job ID and filename.
    This is optimized for job documents with UUID-based filenames.
    """
    try:
        s3_service = get_s3_service()
        
        # Search for the file in the job's directory structure
        job_files = await s3_service.list_files(f"uploads/jobs/{job_id}/")
        
        s3_key = None
        for file_info in job_files:
            if file_info["filename"] == filename:
                s3_key = file_info["key"]
                break
        
        if not s3_key:
            raise HTTPException(status_code=404, detail="File not found")
        
        # Generate presigned URL for file access
        presigned_url = s3_service.generate_presigned_url(s3_key, expiration=3600)
        
        # If download is requested, add appropriate headers
        if download:
            return RedirectResponse(
                url=presigned_url,
                status_code=302,
                headers={
                    "Content-Disposition": f"attachment; filename={as_name or filename}"
                }
            )
        else:
            return RedirectResponse(url=presigned_url, status_code=302)
            
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error retrieving job file: {str(e)}")

@router.get("/files/check/{document_type}/{entity_id}")
async def check_files(document_type: str, entity_id: str):
    """
    Check if files exist for a specific document type and entity
    Returns a list of file paths that match the pattern
    Now works with S3 storage.
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
    
    try:
        s3_service = get_s3_service()
        
        # Search for files with the pattern entity_id_document_type_*
        prefix = f"uploads/{document_type}/"
        all_files = await s3_service.list_files(prefix)
        
        # Filter files that match the pattern
        pattern = f"{entity_id}_{document_type}_"
        matching_files = [f for f in all_files if f["filename"].startswith(pattern)]
        
        # Get detailed file information
        file_details = []
        for file_info in matching_files:
            file_details.append({
                "filename": file_info["filename"],
                "size": file_info["size"],
                "size_mb": round(file_info["size"] / 1024 / 1024, 2),
                "modified_time": file_info["last_modified"].timestamp(),
                "extension": os.path.splitext(file_info["filename"])[1].lower()
            })
        
        return {
            "files": [f["filename"] for f in matching_files],  # Keep backward compatibility
            "file_details": file_details
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error checking files: {str(e)}")

@router.delete("/files/{document_type}/{entity_id}/{filename}")
async def delete_file(document_type: str, entity_id: str, filename: str):
    """
    Delete a specific file for a document type and entity
    Now works with S3 storage.
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
    
    # Verify the filename matches the expected pattern for this entity and document type
    expected_pattern = f"{entity_id}_{document_type}_"
    if not filename.startswith(expected_pattern):
        raise HTTPException(status_code=403, detail="Access denied: File does not belong to this entity")
    
    try:
        s3_service = get_s3_service()
        
        # Construct the S3 key
        s3_key = f"uploads/{document_type}/{filename}"
        
        # Check if file exists
        if not await s3_service.file_exists(s3_key):
            raise HTTPException(status_code=404, detail="File not found")
        
        # Delete the file from S3
        success = await s3_service.delete_file(s3_key)
        
        if success:
            return {"message": f"File {filename} deleted successfully"}
        else:
            raise HTTPException(status_code=404, detail="File not found")
            
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete file: {str(e)}")
