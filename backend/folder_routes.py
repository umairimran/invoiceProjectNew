from fastapi import APIRouter, HTTPException, Depends, Body, UploadFile, File
from typing import List, Optional
from bson import ObjectId
from datetime import datetime
import shutil
import os
from pathlib import Path
import secrets

from models import (
    User, Folder, FolderCreate, FolderInDB, FolderType,
    File as FileModel, FileCreate, FileInDB
)
from db import folders_collection, files_collection, invoices_collection
from auth import get_current_user, get_current_admin

router = APIRouter()

# Helper function for creating upload directory
def ensure_upload_dir(path: str) -> Path:
    """Ensure the upload directory exists"""
    directory = Path(path)
    directory.mkdir(parents=True, exist_ok=True)
    return directory

# Folder endpoints
@router.post("/invoices/{invoice_id}/folders", response_model=Folder)
async def create_folder(
    invoice_id: str,
    folder: FolderCreate,
    current_user: User = Depends(get_current_user)
):
    """Create a new folder for an invoice"""
    try:
        invoice_obj_id = ObjectId(invoice_id)
    except:
        raise HTTPException(status_code=400, detail="Invalid invoice ID format")
    
    # Check if invoice exists
    if not await invoices_collection.find_one({"_id": invoice_obj_id}):
        raise HTTPException(status_code=404, detail="Invoice not found")
    
    # Ensure the folder's invoice_id matches the path parameter
    if folder.invoice_id != invoice_id:
        folder.invoice_id = invoice_id
    
    # Create folder document
    folder_in_db = FolderInDB(
        **folder.dict(),
        created_by=current_user.id
    )
    
    # Insert into database
    result = await folders_collection.insert_one(folder_in_db.dict(exclude={"id"}))
    
    # Return created folder
    created_folder = await folders_collection.find_one({"_id": result.inserted_id})
    
    return Folder(
        id=str(created_folder["_id"]),
        name=created_folder["name"],
        type=created_folder["type"],
        invoice_id=created_folder["invoice_id"],
        created_by=created_folder["created_by"],
        created_at=created_folder["created_at"],
        is_verified=created_folder["is_verified"],
        verified_by=created_folder.get("verified_by"),
        verified_at=created_folder.get("verified_at")
    )

@router.get("/invoices/{invoice_id}/folders", response_model=List[Folder])
async def read_folders(
    invoice_id: str,
    current_user: User = Depends(get_current_user)
):
    """Get all folders for an invoice"""
    try:
        invoice_obj_id = ObjectId(invoice_id)
    except:
        raise HTTPException(status_code=400, detail="Invalid invoice ID format")
    
    # Check if invoice exists
    if not await invoices_collection.find_one({"_id": invoice_obj_id}):
        raise HTTPException(status_code=404, detail="Invoice not found")
    
    # Fetch folders
    folders = []
    async for folder in folders_collection.find({"invoice_id": invoice_id}):
        folders.append(Folder(
            id=str(folder["_id"]),
            name=folder["name"],
            type=folder["type"],
            invoice_id=folder["invoice_id"],
            created_by=folder["created_by"],
            created_at=folder["created_at"],
            is_verified=folder["is_verified"],
            verified_by=folder.get("verified_by"),
            verified_at=folder.get("verified_at")
        ))
    return folders

@router.post("/invoices/{invoice_id}/generate_checklist")
async def generate_default_checklist(
    invoice_id: str,
    current_user: User = Depends(get_current_user)
):
    """Generate default checklist folders for an invoice"""
    try:
        invoice_obj_id = ObjectId(invoice_id)
    except:
        raise HTTPException(status_code=400, detail="Invalid invoice ID format")
    
    # Check if invoice exists
    invoice = await invoices_collection.find_one({"_id": invoice_obj_id})
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    
    # Define default folders
    default_folders = [
        {"name": "Agency Invoice", "type": FolderType.AGENCY_INVOICE},
        {"name": "Approved Quotation", "type": FolderType.APPROVED_QUOTATION},
        {"name": "Job Order", "type": FolderType.JOB_ORDER},
        {"name": "Timesheet", "type": FolderType.TIMESHEET},
        {"name": "Third Party", "type": FolderType.THIRD_PARTY},
        {"name": "Performance Proof", "type": FolderType.PERFORMANCE_PROOF}
    ]
    
    # Check if folders already exist
    existing_folders = []
    async for folder in folders_collection.find({"invoice_id": invoice_id}):
        existing_folders.append(folder["type"])
    
    # Create missing folders
    created_folders = []
    for folder_def in default_folders:
        if folder_def["type"] not in existing_folders:
            folder_in_db = FolderInDB(
                name=folder_def["name"],
                type=folder_def["type"],
                invoice_id=invoice_id,
                created_by=current_user.id
            )
            
            result = await folders_collection.insert_one(folder_in_db.dict(exclude={"id"}))
            created_folder = await folders_collection.find_one({"_id": result.inserted_id})
            
            created_folders.append(Folder(
                id=str(created_folder["_id"]),
                name=created_folder["name"],
                type=created_folder["type"],
                invoice_id=created_folder["invoice_id"],
                created_by=created_folder["created_by"],
                created_at=created_folder["created_at"],
                is_verified=created_folder["is_verified"],
                verified_by=created_folder.get("verified_by"),
                verified_at=created_folder.get("verified_at")
            ))
    
    return {
        "message": f"Created {len(created_folders)} default folders",
        "folders": created_folders
    }

@router.post("/folders/{folder_id}/verify")
async def verify_folder(
    folder_id: str,
    current_user: User = Depends(get_current_user)
):
    """Mark a folder as verified"""
    try:
        folder_obj_id = ObjectId(folder_id)
    except:
        raise HTTPException(status_code=400, detail="Invalid folder ID format")
    
    # Check if folder exists
    if not await folders_collection.find_one({"_id": folder_obj_id}):
        raise HTTPException(status_code=404, detail="Folder not found")
    
    # Update folder
    await folders_collection.update_one(
        {"_id": folder_obj_id},
        {"$set": {
            "is_verified": True,
            "verified_by": current_user.id,
            "verified_at": datetime.utcnow()
        }}
    )
    
    # Return updated folder
    updated_folder = await folders_collection.find_one({"_id": folder_obj_id})
    
    return {
        "message": "Folder verified successfully",
        "folder": Folder(
            id=str(updated_folder["_id"]),
            name=updated_folder["name"],
            type=updated_folder["type"],
            invoice_id=updated_folder["invoice_id"],
            created_by=updated_folder["created_by"],
            created_at=updated_folder["created_at"],
            is_verified=updated_folder["is_verified"],
            verified_by=updated_folder.get("verified_by"),
            verified_at=updated_folder.get("verified_at")
        )
    }

# File endpoints
@router.post("/folders/{folder_id}/files", response_model=FileModel)
async def upload_file(
    folder_id: str,
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user)
):
    """Upload a file to a folder"""
    try:
        folder_obj_id = ObjectId(folder_id)
    except:
        raise HTTPException(status_code=400, detail="Invalid folder ID format")
    
    # Check if folder exists
    folder = await folders_collection.find_one({"_id": folder_obj_id})
    if not folder:
        raise HTTPException(status_code=404, detail="Folder not found")
    
    # Save to local project dir (backend/uploads/)
    from local_storage import save_file as local_save
    file_content = await file.read()
    timestamp = int(datetime.utcnow().timestamp())
    random_suffix = secrets.token_hex(4)
    filename = f"{folder_id}_{timestamp}_{random_suffix}_{file.filename}"
    folder_type = folder["type"]
    relative_path = f"uploads/{folder_type}/{filename}"
    upload_result = local_save(relative_path, file_content, content_type=file.content_type)
    file_path = relative_path
    file_size = upload_result["size"]
    
    # Create file document
    file_in_db = FileInDB(
        folder_id=folder_id,
        file_path=file_path,
        original_filename=file.filename,
        file_size=file_size,
        mime_type=file.content_type,
        uploaded_by=current_user.id
    )
    
    # Insert into database
    result = await files_collection.insert_one(file_in_db.dict(exclude={"id"}))
    
    # Return created file
    created_file = await files_collection.find_one({"_id": result.inserted_id})
    
    return FileModel(
        id=str(created_file["_id"]),
        folder_id=created_file["folder_id"],
        file_path=created_file["file_path"],
        original_filename=created_file["original_filename"],
        file_size=created_file["file_size"],
        mime_type=created_file.get("mime_type"),
        metadata=created_file.get("metadata"),
        uploaded_by=created_file["uploaded_by"],
        uploaded_at=created_file["uploaded_at"]
    )

@router.get("/folders/{folder_id}/files", response_model=List[FileModel])
async def read_files(
    folder_id: str,
    current_user: User = Depends(get_current_user)
):
    """Get all files in a folder"""
    try:
        folder_obj_id = ObjectId(folder_id)
    except:
        raise HTTPException(status_code=400, detail="Invalid folder ID format")
    
    # Check if folder exists
    if not await folders_collection.find_one({"_id": folder_obj_id}):
        raise HTTPException(status_code=404, detail="Folder not found")
    
    # Fetch files
    files = []
    async for file in files_collection.find({"folder_id": folder_id}):
        files.append(FileModel(
            id=str(file["_id"]),
            folder_id=file["folder_id"],
            file_path=file["file_path"],
            original_filename=file["original_filename"],
            file_size=file["file_size"],
            mime_type=file.get("mime_type"),
            metadata=file.get("metadata"),
            uploaded_by=file["uploaded_by"],
            uploaded_at=file["uploaded_at"]
        ))
    return files

@router.delete("/files/{file_id}")
async def delete_file(
    file_id: str,
    current_user: User = Depends(get_current_user)
):
    """Delete a file"""
    try:
        file_obj_id = ObjectId(file_id)
    except:
        raise HTTPException(status_code=400, detail="Invalid file ID format")
    
    # Check if file exists
    file = await files_collection.find_one({"_id": file_obj_id})
    if not file:
        raise HTTPException(status_code=404, detail="File not found")
    
    # Delete file from local storage
    file_path = file.get("file_path")
    if file_path and str(file_path).startswith("uploads/"):
        try:
            from local_storage import delete_file as local_delete
            local_delete(file_path)
        except Exception:
            pass
    elif file_path and os.path.isabs(file_path) and os.path.isfile(file_path):
        try:
            os.remove(file_path)
        except Exception:
            pass
    
    # Delete file from database
    await files_collection.delete_one({"_id": file_obj_id})
    
    return {"message": "File deleted successfully"}
