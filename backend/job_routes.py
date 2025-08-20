from fastapi import APIRouter, HTTPException, Depends, Body, File, UploadFile, Form
from typing import List, Optional, Dict
from bson import ObjectId
from datetime import datetime
import os
import uuid
import json
import asyncio

from models import (
    Job, JobCreate, JobInDB, JobStatus, JobReview, JobChecklist, Document,
    User
)
from db import jobs_collection, agencies_collection
from ai_processor import process_job_documents, validate_job_checklist, extract_invoices_text, extract_agency_details_from_invoices, extract_po_details_from_job_order, extract_media_plan_details

router = APIRouter()

# Define upload directory
UPLOAD_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "uploads")

# Job endpoints
@router.post("/agencies/{agency_code}/jobs", response_model=Job)
async def create_job(
    agency_code: str,
    job: JobCreate,
    # current_user: User = Depends(get_current_user)
):
    """Create a new job for an agency"""
    # Check if agency exists
    agency = await agencies_collection.find_one({"agency_code": agency_code})
    if not agency:
        raise HTTPException(status_code=404, detail="Agency not found")
    
    # Ensure the job's agency_id matches the path parameter
    if job.agency_id != agency_code:
        raise HTTPException(status_code=400, detail="Job agency_id must match the agency_code in the URL")
    
    # Create job document
    job_in_db = JobInDB(
        **job.dict(),
        created_by="Admin"
    )
    
    # Insert into database
    result = await jobs_collection.insert_one(job_in_db.dict(exclude={"id"}))
    
    # Return created job
    created_job = await jobs_collection.find_one({"_id": result.inserted_id})
    
    # Convert MongoDB document to Job model
    return Job(
        id=str(created_job["_id"]),
        agency_id=created_job["agency_id"],
        title=created_job["title"],
        description=created_job.get("description"),
        start_date=created_job.get("start_date"),
        end_date=created_job.get("end_date"),
        status=created_job.get("status", "pending"),  # Default to pending if status is missing
        review=created_job["review"],
        checklist=created_job["checklist"],
        created_by="Admin",
        created_at=created_job["created_at"],
        updated_at=created_job["updated_at"]
    )

@router.get("/agencies/{agency_code}/jobs", response_model=List[Job])
async def read_jobs(
    agency_code: str,
    status: Optional[JobStatus] = None,
    # current_user: User = Depends(get_current_user)
):
    """Get all jobs for an agency, optionally filtered by status"""
    # Check if agency exists
    if not await agencies_collection.find_one({"agency_code": agency_code}):
        raise HTTPException(status_code=404, detail="Agency not found")
    
    # Build query
    query = {"agency_id": agency_code}
    if status:
        query["status"] = status
    
    # Fetch jobs
    jobs = []
    async for job in jobs_collection.find(query):
        # Handle case where older jobs might not have review or checklist fields
        review = job.get("review", {})
        checklist = job.get("checklist", {
            "agency_invoice": [],
            "approved_quotation": [],
            "job_order": [],
            "timesheet": [],
            "third_party": [],
            "performance_proof": []
        })
        
        jobs.append(Job(
            id=str(job["_id"]),
            agency_id=job["agency_id"],
            title=job["title"],
            description=job.get("description"),
            start_date=job.get("start_date"),
            end_date=job.get("end_date"),
            status=job.get("status", "pending"),  # Default to pending if status is missing
            review=review,
            checklist=checklist,
            created_by=job["created_by"],
            created_at=job["created_at"],
            updated_at=job["updated_at"]
        ))
    return jobs

@router.get("/jobs/{job_id}", response_model=Job)
async def read_job(
    job_id: str,
    # current_user: User = Depends(get_current_user)
):
    """Get a job by ID"""
    try:
        object_id = ObjectId(job_id)
    except:
        raise HTTPException(status_code=400, detail="Invalid job ID format")
    
    if (job := await jobs_collection.find_one({"_id": object_id})) is not None:
        # Handle case where older jobs might not have review or checklist fields
        review = job.get("review", {})
        checklist = job.get("checklist", {
            "agency_invoice": [],
            "approved_quotation": [],
            "job_order": [],
            "timesheet": [],
            "third_party": [],
            "performance_proof": []
        })
        
        return Job(
            id=str(job["_id"]),
            agency_id=job["agency_id"],
            title=job["title"],
            description=job.get("description"),
            start_date=job.get("start_date"),
            end_date=job.get("end_date"),
            status=job.get("status", "pending"),  # Default to pending if status is missing
            review=review,
            checklist=checklist,
            created_by=job["created_by"],
            created_at=job["created_at"],
            updated_at=job["updated_at"]
        )
    raise HTTPException(status_code=404, detail="Job not found")

@router.put("/jobs/{job_id}", response_model=Job)
async def update_job(
    job_id: str,
    job_update: dict = Body(...),
    # current_user: User = Depends(get_current_user)
):
    """Update a job"""
    try:
        object_id = ObjectId(job_id)
    except:
        raise HTTPException(status_code=400, detail="Invalid job ID format")
    
    # Check if job exists
    existing_job = await jobs_collection.find_one({"_id": object_id})
    if not existing_job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    # Prepare update data - now including review and checklist
    allowed_fields = [
        "title", "description", "start_date", "end_date", "status"
    ]
    
    # Basic fields update
    update_data = {k: v for k, v in job_update.items() if k in allowed_fields}
    
    # Handle review update if provided
    if "review" in job_update:
        update_data["review"] = job_update["review"]
    
    # Handle checklist update if provided
    if "checklist" in job_update:
        # Merge with existing checklist if it exists
        existing_checklist = existing_job.get("checklist", {
            "agency_invoice": [],
            "approved_quotation": [],
            "job_order": [],
            "timesheet": [],
            "third_party": [],
            "performance_proof": []
        })
        
        # Update each folder in the checklist
        for folder_name in ["agency_invoice", "approved_quotation", "job_order", 
                           "timesheet", "third_party", "performance_proof"]:
            if folder_name in job_update["checklist"]:
                existing_checklist[folder_name] = job_update["checklist"][folder_name]
        
        update_data["checklist"] = existing_checklist
    
    # Add updated_at timestamp
    update_data["updated_at"] = datetime.utcnow()
    
    # Update job
    await jobs_collection.update_one(
        {"_id": object_id},
        {"$set": update_data}
    )
    
    # Return updated job
    updated_job = await jobs_collection.find_one({"_id": object_id})
    
    # Handle case where older jobs might not have review or checklist fields
    review = updated_job.get("review", {})
    checklist = updated_job.get("checklist", {
        "agency_invoice": [],
        "approved_quotation": [],
        "job_order": [],
        "timesheet": [],
        "third_party": [],
        "performance_proof": []
    })
    
    return Job(
        id=str(updated_job["_id"]),
        agency_id=updated_job["agency_id"],
        title=updated_job["title"],
        description=updated_job.get("description"),
        start_date=updated_job.get("start_date"),
        end_date=updated_job.get("end_date"),
        status=updated_job["status"],
        review=review,
        checklist=checklist,
        created_by=updated_job["created_by"],
        created_at=updated_job["created_at"],
        updated_at=updated_job["updated_at"]
    )

@router.delete("/jobs/{job_id}")
async def delete_job(
    job_id: str,
    # current_user: User = Depends(get_current_user)
):
    """Delete a job"""
    try:
        object_id = ObjectId(job_id)
    except:
        raise HTTPException(status_code=400, detail="Invalid job ID format")
    
    # Check if job exists
    if not await jobs_collection.find_one({"_id": object_id}):
        raise HTTPException(status_code=404, detail="Job not found")
    
    # Delete job
    await jobs_collection.delete_one({"_id": object_id})
    
    return {"message": "Job deleted successfully"}


# Document upload endpoints for job checklists
@router.post("/jobs/{job_id}/documents/{folder_type}", response_model=Document)
async def upload_document_to_job(
    job_id: str,
    folder_type: str,
    file: UploadFile = File(...),
    metadata: str = Form("{}"),
    # current_user: User = Depends(get_current_user)
):
    """Upload a document to a job's checklist folder"""
    # Validate folder type
    valid_folders = ["agency_invoice", "approved_quotation", "job_order", 
                    "timesheet", "third_party", "performance_proof"]
    
    if folder_type not in valid_folders:
        raise HTTPException(
            status_code=400, 
            detail=f"Invalid folder type. Must be one of: {', '.join(valid_folders)}"
        )
    
    try:
        object_id = ObjectId(job_id)
    except:
        raise HTTPException(status_code=400, detail="Invalid job ID format")
    
    # Check if job exists
    job = await jobs_collection.find_one({"_id": object_id})
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    # Create uploads directory if it doesn't exist
    job_upload_dir = os.path.join(UPLOAD_DIR, "jobs", job_id, folder_type)
    os.makedirs(job_upload_dir, exist_ok=True)
    
    # Generate unique filename
    file_extension = os.path.splitext(file.filename)[1]
    unique_filename = f"{uuid.uuid4()}{file_extension}"
    file_path = os.path.join(job_upload_dir, unique_filename)
    
    # Save file
    with open(file_path, "wb") as buffer:
        buffer.write(await file.read())
    
    # Parse metadata
    try:
        parsed_metadata = json.loads(metadata)
    except json.JSONDecodeError:
        parsed_metadata = {}
    
    # Create document
    document = Document(
        file_path=f"uploads/jobs/{job_id}/{folder_type}/{unique_filename}", #Corrected file path
        original_filename=file.filename,
        metadata=parsed_metadata,
        # uploaded_by=current_user.id
    )
    
    # Update job checklist
    # Initialize checklist if it doesn't exist
    if "checklist" not in job:
        job["checklist"] = {
            "agency_invoice": [],
            "approved_quotation": [],
            "job_order": [],
            "timesheet": [],
            "third_party": [],
            "performance_proof": []
        }
    
    # Add document to checklist
    if folder_type not in job["checklist"]:
        job["checklist"][folder_type] = []
    
    job["checklist"][folder_type].append(document.dict())
    
    # Update job
    await jobs_collection.update_one(
        {"_id": object_id},
        {"$set": {
            f"checklist.{folder_type}": job["checklist"][folder_type],
            "updated_at": datetime.utcnow()
        }}
    )
    
    return document


@router.get("/jobs/{job_id}/documents/{folder_type}", response_model=List[Document])
async def get_job_documents(
    job_id: str,
    folder_type: str,
    # current_user: User = Depends(get_current_user)
):
    """Get all documents in a job's checklist folder"""
    # Validate folder type
    valid_folders = ["agency_invoice", "approved_quotation", "job_order", 
                    "timesheet", "third_party", "performance_proof"]
    
    if folder_type not in valid_folders:
        raise HTTPException(
            status_code=400, 
            detail=f"Invalid folder type. Must be one of: {', '.join(valid_folders)}"
        )
    
    try:
        object_id = ObjectId(job_id)
    except:
        raise HTTPException(status_code=400, detail="Invalid job ID format")
    
    # Check if job exists
    job = await jobs_collection.find_one({"_id": object_id})
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    # Get documents from checklist
    if "checklist" not in job or folder_type not in job["checklist"]:
        return []
    
    return job["checklist"][folder_type]


@router.delete("/jobs/{job_id}/documents/{folder_type}/{document_index}")
async def delete_job_document(
    job_id: str,
    folder_type: str,
    document_index: int,
    # current_user: User = Depends(get_current_user)
):
    """Delete a document from a job's checklist folder"""
    # Validate folder type
    valid_folders = ["agency_invoice", "approved_quotation", "job_order", 
                    "timesheet", "third_party", "performance_proof"]
    
    if folder_type not in valid_folders:
        raise HTTPException(
            status_code=400, 
            detail=f"Invalid folder type. Must be one of: {', '.join(valid_folders)}"
        )
    
    try:
        object_id = ObjectId(job_id)
    except:
        raise HTTPException(status_code=400, detail="Invalid job ID format")
    
    # Check if job exists
    job = await jobs_collection.find_one({"_id": object_id})
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    # Check if document exists
    if ("checklist" not in job or 
        folder_type not in job["checklist"] or 
        document_index >= len(job["checklist"][folder_type])):
        raise HTTPException(status_code=404, detail="Document not found")
    
    # Get document to delete
    document = job["checklist"][folder_type][document_index]
    
    # Delete file if it exists
    file_path = os.path.join(UPLOAD_DIR, document["file_path"])
    if os.path.exists(file_path):
        os.remove(file_path)
    
    # Remove document from checklist
    job["checklist"][folder_type].pop(document_index)
    
    # Update job
    await jobs_collection.update_one(
        {"_id": object_id},
        {"$set": {
            f"checklist.{folder_type}": job["checklist"][folder_type],
            "updated_at": datetime.utcnow()
        }}
    )
    
    return {"message": "Document deleted successfully"}




@router.post("/jobs/{job_id}/run_ai_process", response_model=Job)
async def run_ai_process(job_id: str):
    """
    Run AI process for a given job ID.
    This endpoint processes all documents in the job's checklist,
    extracts relevant information, and updates the job's review field.
    """
    try:
        object_id = ObjectId(job_id)
    except:
        raise HTTPException(status_code=400, detail="Invalid job ID format")
    
    # Step 1: Get the job details
    job = await jobs_collection.find_one({"_id": object_id})
    print((job))
 
    # Process agency invoices
    agency_invoices = job.get("checklist", {}).get("agency_invoice", [])
    invoices_text_extracted = extract_invoices_text(agency_invoices)
    invoice_details = extract_agency_details_from_invoices(invoices_text_extracted, agency_invoices)
    
    # Process job order (PO)
    job_order_docs = job.get("checklist", {}).get("job_order", [])
    po_details = extract_po_details_from_job_order(job_order_docs)
    
    # For debugging
    print("INVOICE DETAILS:", json.dumps(invoice_details, indent=4))
    print("PO DETAILS:", json.dumps(po_details, indent=4))

    # Process approved quotation for media plan details
    approved_quotation_docs = job.get("checklist", {}).get("approved_quotation", [])
    media_plan_details = extract_media_plan_details(approved_quotation_docs)
    print("MEDIA PLAN DETAILS:", json.dumps(media_plan_details, indent=4))

    # --- Step 4: Validate Job Checklist ---
    validation_result = validate_job_checklist(job)
    
    # --- Step 5: Combine Results and Update Job ---
    final_review_data = {
        # Header / identifiers
        "market_bu": media_plan_details.get("market_type"),
        "agency_invoice_number": invoice_details.get("summary", {}).get("agency_invoice_details"),
        "po_number": po_details.get("po_number"),
        "period_month": media_plan_details.get("period_month"),

        # Timeline (dates) - Currently not extracted by AI, so set to None
        "date_invoice_sent_to_medpush": None,
        "date_medpush_shared_feedback": None,
        "date_agency_responded_to_feedback": None,
        "date_medpush_approved_invoice": None,

        # Campaign / medium
        "medium": media_plan_details.get("medium"),
        "campaign_name": invoice_details.get("invoices", [{}])[0].get("campaign_name"),

        # Financials
        "net_media_cost": media_plan_details.get("net_media_cost"),
        "agency_fee": media_plan_details.get("agency_fees"),
        "taxes": media_plan_details.get("taxes_amount"),
        "other_third_party_cost": media_plan_details.get("third_party_cost"),
        "agency_invoice_total_amount": invoice_details.get("summary", {}).get("total_amount"),
        "media_plan_total_amount": media_plan_details.get("media_plan_total_amount"),
        "po_amount_with_af": po_details.get("po_amount"),

        # Review text - Now set based on validation results
        "initial_review_outcome": validation_result["initial_review_outcome"],
        "agency_feedback_action": None,
        "final_review_outcome": validation_result["final_review_outcome"],
        "status_of_received_invoices": None,

        # Month tag
        "month_medpush_received_invoice": None,

        # Durations (# of days)
        "days_medpush_to_review_and_share_feedback": None,
        "days_agency_to_revert_to_medpush": None,
        "days_medpush_to_approve_after_revision": None,

        # Raw AI Output
        "raw_ai_invoice_output": invoice_details,
        "raw_ai_po_output": po_details,
        "raw_ai_media_plan_output": media_plan_details
    }
    
    # Update the job with the extracted details
    update_data = {"review": final_review_data}
    updated_job = await jobs_collection.find_one_and_update(
        {"_id": object_id},
        {"$set": update_data},
        return_document=True
    )

    if not updated_job:
        raise HTTPException(status_code=404, detail="Job not found after update")

    # Convert _id to string for the response model
    updated_job["id"] = str(updated_job["_id"])
    
    return Job(**updated_job)
