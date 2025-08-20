from fastapi import APIRouter, HTTPException, Depends, Body, Query
from typing import List, Optional
from bson import ObjectId
from datetime import datetime
import io
import zipfile
from fastapi.responses import StreamingResponse

from models import (
    User, Invoice, InvoiceCreate, InvoiceInDB, InvoiceStatus
)
from db import invoices_collection, agencies_collection, clients_collection, jobs_collection, files_collection, folders_collection
from auth import get_current_user

router = APIRouter()

# Invoice endpoints
@router.post("/agencies/{agency_code}/jobs/{job_id}/invoices", response_model=Invoice)
async def create_invoice(
    agency_code: str,
    job_id: str,
    invoice: InvoiceCreate,
    current_user: User = Depends(get_current_user)
):
    """Create a new invoice for a job"""
    # Check if agency exists
    if not await agencies_collection.find_one({"agency_code": agency_code}):
        raise HTTPException(status_code=404, detail="Agency not found")
    
    # Check if job exists
    try:
        job_obj_id = ObjectId(job_id)
    except:
        raise HTTPException(status_code=400, detail="Invalid job ID format")
    
    job = await jobs_collection.find_one({"_id": job_obj_id})
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    # Check if job belongs to the agency
    if job["agency_id"] != agency_code:
        raise HTTPException(status_code=400, detail="Job does not belong to this agency")
    
    # Ensure the invoice's agency_id and job_id match the path parameters
    if invoice.agency_id != agency_code:
        raise HTTPException(status_code=400, detail="Invoice agency_id must match the agency_code in the URL")
    
    if invoice.job_id != job_id:
        raise HTTPException(status_code=400, detail="Invoice job_id must match the job_id in the URL")
    
    # Check if client exists
    if not await clients_collection.find_one({"client_code": invoice.client_id}):
        raise HTTPException(status_code=400, detail="Client not found")
    
    # Create invoice document
    invoice_in_db = InvoiceInDB(
        **invoice.dict(),
        created_by=current_user.id
    )
    
    # Insert into database
    result = await invoices_collection.insert_one(invoice_in_db.dict(exclude={"id"}))
    
    # Return created invoice
    created_invoice = await invoices_collection.find_one({"_id": result.inserted_id})
    
    return Invoice(
        id=str(created_invoice["_id"]),
        agency_id=created_invoice["agency_id"],
        client_id=created_invoice["client_id"],
        job_id=created_invoice["job_id"],
        status=created_invoice["status"],
        checklist=created_invoice["checklist"],
        notes=created_invoice.get("notes"),
        created_by=created_invoice["created_by"],
        created_at=created_invoice["created_at"],
        updated_at=created_invoice["updated_at"]
    )

@router.get("/agencies/{agency_code}/invoices", response_model=List[Invoice])
async def read_agency_invoices(
    agency_code: str,
    status: Optional[InvoiceStatus] = None,
    current_user: User = Depends(get_current_user)
):
    """Get all invoices for an agency, optionally filtered by status"""
    # Check if agency exists
    if not await agencies_collection.find_one({"agency_code": agency_code}):
        raise HTTPException(status_code=404, detail="Agency not found")
    
    # Build query
    query = {"agency_id": agency_code}
    if status:
        query["status"] = status
    
    # Fetch invoices
    invoices = []
    async for invoice in invoices_collection.find(query):
        invoices.append(Invoice(
            id=str(invoice["_id"]),
            agency_id=invoice["agency_id"],
            client_id=invoice["client_id"],
            job_id=invoice["job_id"],
            status=invoice["status"],
            checklist=invoice["checklist"],
            notes=invoice.get("notes"),
            created_by=invoice["created_by"],
            created_at=invoice["created_at"],
            updated_at=invoice["updated_at"]
        ))
    return invoices

@router.get("/invoices", response_model=List[Invoice])
async def read_invoices(
    agency_id: Optional[str] = None,
    client_id: Optional[str] = None,
    job_id: Optional[str] = None,
    status: Optional[InvoiceStatus] = None,
    current_user: User = Depends(get_current_user)
):
    """Get all invoices, optionally filtered by agency_id, client_id, job_id, or status"""
    # Build query
    query = {}
    if agency_id:
        query["agency_id"] = agency_id
    if client_id:
        query["client_id"] = client_id
    if job_id:
        query["job_id"] = job_id
    if status:
        query["status"] = status
    
    # Fetch invoices
    invoices = []
    async for invoice in invoices_collection.find(query):
        invoices.append(Invoice(
            id=str(invoice["_id"]),
            agency_id=invoice["agency_id"],
            client_id=invoice["client_id"],
            job_id=invoice["job_id"],
            status=invoice["status"],
            checklist=invoice["checklist"],
            notes=invoice.get("notes"),
            created_by=invoice["created_by"],
            created_at=invoice["created_at"],
            updated_at=invoice["updated_at"]
        ))
    return invoices

@router.get("/invoices/{invoice_id}", response_model=Invoice)
async def read_invoice(
    invoice_id: str,
    current_user: User = Depends(get_current_user)
):
    """Get an invoice by ID"""
    try:
        object_id = ObjectId(invoice_id)
    except:
        raise HTTPException(status_code=400, detail="Invalid invoice ID format")
    
    if (invoice := await invoices_collection.find_one({"_id": object_id})) is not None:
        return Invoice(
            id=str(invoice["_id"]),
            agency_id=invoice["agency_id"],
            client_id=invoice["client_id"],
            job_id=invoice["job_id"],
            status=invoice["status"],
            checklist=invoice["checklist"],
            notes=invoice.get("notes"),
            created_by=invoice["created_by"],
            created_at=invoice["created_at"],
            updated_at=invoice["updated_at"]
        )
    raise HTTPException(status_code=404, detail="Invoice not found")

@router.put("/invoices/{invoice_id}", response_model=Invoice)
async def update_invoice(
    invoice_id: str,
    invoice_update: dict = Body(...),
    current_user: User = Depends(get_current_user)
):
    """Update an invoice"""
    try:
        object_id = ObjectId(invoice_id)
    except:
        raise HTTPException(status_code=400, detail="Invalid invoice ID format")
    
    # Check if invoice exists
    if not await invoices_collection.find_one({"_id": object_id}):
        raise HTTPException(status_code=404, detail="Invoice not found")
    
    # Prepare update data
    update_data = {k: v for k, v in invoice_update.items() if k in [
        "status", "notes"
    ]}
    
    # Add updated_at timestamp
    update_data["updated_at"] = datetime.utcnow()
    
    # Update invoice
    await invoices_collection.update_one(
        {"_id": object_id},
        {"$set": update_data}
    )
    
    # Return updated invoice
    updated_invoice = await invoices_collection.find_one({"_id": object_id})
    
    return Invoice(
        id=str(updated_invoice["_id"]),
        agency_id=updated_invoice["agency_id"],
        client_id=updated_invoice["client_id"],
        job_id=updated_invoice["job_id"],
        status=updated_invoice["status"],
        checklist=updated_invoice["checklist"],
        notes=updated_invoice.get("notes"),
        created_by=updated_invoice["created_by"],
        created_at=updated_invoice["created_at"],
        updated_at=updated_invoice["updated_at"]
    )

@router.delete("/invoices/{invoice_id}")
async def delete_invoice(
    invoice_id: str,
    current_user: User = Depends(get_current_user)
):
    """Delete an invoice"""
    try:
        object_id = ObjectId(invoice_id)
    except:
        raise HTTPException(status_code=400, detail="Invalid invoice ID format")
    
    # Check if invoice exists
    if not await invoices_collection.find_one({"_id": object_id}):
        raise HTTPException(status_code=404, detail="Invoice not found")
    
    # Delete invoice
    await invoices_collection.delete_one({"_id": object_id})
    
    return {"message": "Invoice deleted successfully"}

@router.get("/invoices/{invoice_id}/download")
async def download_invoice_files(
    invoice_id: str,
    current_user: User = Depends(get_current_user)
):
    """Download all files in an invoice as a ZIP archive"""
    try:
        invoice_obj_id = ObjectId(invoice_id)
    except:
        raise HTTPException(status_code=400, detail="Invalid invoice ID format")
    
    # Check if invoice exists
    invoice = await invoices_collection.find_one({"_id": invoice_obj_id})
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    
    # Get all folders for this invoice
    folders = []
    async for folder in folders_collection.find({"invoice_id": invoice_id}):
        folders.append(folder)
    
    # Create in-memory ZIP file
    zip_buffer = io.BytesIO()
    with zipfile.ZipFile(zip_buffer, 'w', zipfile.ZIP_DEFLATED) as zip_file:
        for folder in folders:
            folder_name = folder["name"]
            folder_id = str(folder["_id"])
            
            # Get all files in this folder
            async for file in files_collection.find({"folder_id": folder_id}):
                file_path = file["file_path"]
                if not file_path or not os.path.exists(file_path):
                    continue
                
                # Add file to ZIP with folder structure
                arcname = f"{folder_name}/{file['original_filename']}"
                zip_file.write(file_path, arcname=arcname)
    
    # Reset buffer position
    zip_buffer.seek(0)
    
    # Create response with ZIP file
    return StreamingResponse(
        zip_buffer,
        media_type="application/zip",
        headers={
            "Content-Disposition": f"attachment; filename=invoice_{invoice_id}.zip"
        }
    )

@router.get("/folders/{folder_id}/download")
async def download_folder_files(
    folder_id: str,
    current_user: User = Depends(get_current_user)
):
    """Download all files in a folder as a ZIP archive"""
    try:
        folder_obj_id = ObjectId(folder_id)
    except:
        raise HTTPException(status_code=400, detail="Invalid folder ID format")
    
    # Check if folder exists
    folder = await folders_collection.find_one({"_id": folder_obj_id})
    if not folder:
        raise HTTPException(status_code=404, detail="Folder not found")
    
    folder_name = folder["name"]
    
    # Create in-memory ZIP file
    zip_buffer = io.BytesIO()
    with zipfile.ZipFile(zip_buffer, 'w', zipfile.ZIP_DEFLATED) as zip_file:
        # Get all files in this folder
        async for file in files_collection.find({"folder_id": folder_id}):
            file_path = file["file_path"]
            if not file_path or not os.path.exists(file_path):
                continue
            
            # Add file to ZIP
            zip_file.write(file_path, arcname=file["original_filename"])
    
    # Reset buffer position
    zip_buffer.seek(0)
    
    # Create response with ZIP file
    return StreamingResponse(
        zip_buffer,
        media_type="application/zip",
        headers={
            "Content-Disposition": f"attachment; filename={folder_name.replace(' ', '_')}.zip"
        }
    )
