from fastapi import APIRouter, HTTPException, UploadFile, File, Body, Depends
from typing import List, Optional
from bson import ObjectId
import os
import shutil
from pathlib import Path
import secrets
import re
from datetime import datetime
from auth import (
    get_password_hash, authenticate_user, create_access_token, JWT_EXPIRATION_MINUTES, get_current_user
)

from models import (
    User, UserCreate, UserInDB, Token,
    Client, ClientCreate, ClientInDB,
    Agency, AgencyCreate, AgencyInDB,
    Invoice, InvoiceCreate, InvoiceInDB,
)
from db import users_collection, clients_collection, agencies_collection, invoices_collection, jobs_collection

router = APIRouter()

# Helper function for creating upload directory
def ensure_upload_dir(path: str) -> Path:
    """Ensure the upload directory exists"""
    directory = Path(path)
    directory.mkdir(parents=True, exist_ok=True)
    return directory

# Code generation helpers
async def generate_unique_code(prefix: str, collection, field_name: str, attempts: int = 10) -> str:
    for _ in range(attempts):
        # 6 hex chars → 24 combinations per byte, good enough for dev; prefix keeps type readable
        code = f"{prefix}-{secrets.token_hex(3).upper()}"
        if not await collection.find_one({field_name: code}):
            return code
    raise HTTPException(status_code=500, detail="Failed to generate unique code")

# Auth endpoints (signup/login)
@router.post("/auth/signup", response_model=User)
async def signup(user: UserCreate):
    if await users_collection.find_one({"email": user.email}):
        raise HTTPException(status_code=400, detail="Email already registered")
    user_dict = user.dict()
    hashed_password = get_password_hash(user_dict.pop("password"))
    user_in_db = UserInDB(**user_dict, hashed_password=hashed_password)
    result = await users_collection.insert_one(user_in_db.dict(exclude={"id"}))
    created_user = await users_collection.find_one({"_id": result.inserted_id})
    return User(
        id=str(created_user["_id"]),
        username=created_user["username"],
        email=created_user["email"],
        role=created_user["role"],
    )

class LoginPayload(UserInDB):
    pass

@router.post("/auth/login", response_model=Token)
async def login(payload: dict = Body(...)):
    email = payload.get("email")
    password = payload.get("password")
    if not email or not password:
        raise HTTPException(status_code=400, detail="email and password are required")
    user = await authenticate_user(email, password)
    if not user:
        raise HTTPException(status_code=401, detail="Incorrect email or password")
    token = create_access_token({"sub": user.email})
    return {"access_token": token, "token_type": "bearer"}

# User endpoints
@router.post("/users", response_model=User)
async def create_user(user: UserCreate):
    """Create a new user (no authorization required during development)"""
    # Check if user already exists
    if await users_collection.find_one({"email": user.email}):
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Create user document
    user_dict = user.dict()
    hashed_password = get_password_hash(user_dict.pop("password"))
    
    user_in_db = UserInDB(**user_dict, hashed_password=hashed_password)
    
    # Insert into database
    result = await users_collection.insert_one(user_in_db.dict(exclude={"id"}))
    
    # Return created user
    created_user = await users_collection.find_one({"_id": result.inserted_id})
    
    return User(
        id=str(created_user["_id"]),
        username=created_user["username"],
        email=created_user["email"],
        role=created_user["role"],
        created_at=created_user.get("created_at")
    )

@router.get("/users/me", response_model=User)
async def read_users_me(current_user: User = Depends(get_current_user)):
    """Get current user info from JWT token"""
    return current_user

@router.get("/users", response_model=List[User])
async def read_users():
    """Get all users (no authorization required during development)"""
    users = []
    async for user in users_collection.find():
        users.append(User(
            id=str(user["_id"]),
            username=user["username"],
            email=user["email"],
            role=user["role"],
            created_at=user.get("created_at")
        ))
    return users

@router.put("/users/{user_id}", response_model=User)
async def update_user(user_id: str, user_data: dict):
    """Update a user"""
    try:
        object_id = ObjectId(user_id)
    except:
        raise HTTPException(status_code=400, detail="Invalid user ID format")
    
    # Check if user exists
    if not await users_collection.find_one({"_id": object_id}):
        raise HTTPException(status_code=404, detail="User not found")
    
    # Prepare update data
    update_data = {}
    if "username" in user_data:
        update_data["username"] = user_data["username"]
    if "email" in user_data:
        update_data["email"] = user_data["email"]
    if "role" in user_data:
        update_data["role"] = user_data["role"]
    
    # Update password if provided
    if "password" in user_data and user_data["password"]:
        update_data["hashed_password"] = get_password_hash(user_data["password"])
    
    # Update user
    await users_collection.update_one(
        {"_id": object_id},
        {"$set": update_data}
    )
    
    # Return updated user
    updated_user = await users_collection.find_one({"_id": object_id})
    return User(
        id=str(updated_user["_id"]),
        username=updated_user["username"],
        email=updated_user["email"],
        role=updated_user["role"],
        created_at=updated_user.get("created_at")
    )

@router.delete("/users/{user_id}")
async def delete_user(user_id: str):
    """Delete a user"""
    try:
        object_id = ObjectId(user_id)
    except:
        raise HTTPException(status_code=400, detail="Invalid user ID format")
    
    # Check if user exists
    if not await users_collection.find_one({"_id": object_id}):
        raise HTTPException(status_code=404, detail="User not found")
    
    # Delete user
    await users_collection.delete_one({"_id": object_id})
    
    return {"message": "User deleted successfully"}

# Client endpoints
@router.post("/clients", response_model=Client)
async def create_client(client: ClientCreate):
    """Create a new client with auto-assigned client_code"""
    # Prevent duplicate by name optionally (soft check)
    # Generate unique client_code
    client_code = await generate_unique_code("CLT", clients_collection, "client_code")
    
    # For development, use a default created_by value
    # In a real app, this would come from the authenticated user
    default_user = await users_collection.find_one()
    created_by_id = str(default_user["_id"]) if default_user else "development_user"
    
    # Create client document
    client_in_db = ClientInDB(**client.dict(), client_code=client_code, created_by=created_by_id)
    
    # Insert into database
    result = await clients_collection.insert_one(client_in_db.dict(exclude={"id"}))
    
    # Return created client
    created_client = await clients_collection.find_one({"_id": result.inserted_id})
    
    return Client(
        id=str(created_client["_id"]),
        client_code=created_client["client_code"],
        name=created_client["name"],
        rate_card_file=created_client.get("rate_card_file"),
        created_by=created_client["created_by"],
        created_at=created_client["created_at"]
    )

@router.get("/clients", response_model=List[Client])
async def read_clients():
    """Get all clients (no authorization required during development)"""
    clients = []
    async for client in clients_collection.find():
        clients.append(Client(
            id=str(client["_id"]),
            client_code=client["client_code"],
            name=client["name"],
            rate_card_file=client.get("rate_card_file"),
            created_by=client["created_by"],
            created_at=client["created_at"]
        ))
    return clients

@router.get("/clients/{client_code}", response_model=Client)
async def read_client(client_code: str):
    """Get a client by business code (no authorization required during development)"""
    if (client := await clients_collection.find_one({"client_code": client_code})) is not None:
        return Client(
            id=str(client["_id"]),
            client_code=client["client_code"],
            name=client["name"],
            rate_card_file=client.get("rate_card_file"),
            created_by=client["created_by"],
            created_at=client["created_at"]
        )
    raise HTTPException(status_code=404, detail="Client not found")

# Agency endpoints
@router.post("/agencies", response_model=Agency)
async def create_agency(agency: AgencyCreate):
    """Create a new agency with auto-assigned agency_code (no authorization required during development)"""
    # Check if client exists (agency.client_id is the client's business code)
    if not await clients_collection.find_one({"client_code": agency.client_id}):
        raise HTTPException(status_code=400, detail="Client not found")
    
    # For development, use a default created_by value
    default_user = await users_collection.find_one()
    created_by_id = str(default_user["_id"]) if default_user else "development_user"
    
    # Generate unique agency_code
    agency_code = await generate_unique_code("AGY", agencies_collection, "agency_code")

    # Create agency document
    agency_in_db = AgencyInDB(**agency.dict(), agency_code=agency_code, created_by=created_by_id)
    
    # Insert into database
    result = await agencies_collection.insert_one(agency_in_db.dict(exclude={"id"}))
    
    # Return created agency
    created_agency = await agencies_collection.find_one({"_id": result.inserted_id})
    
    return Agency(
        id=str(created_agency["_id"]),
        agency_code=created_agency["agency_code"],
        name=created_agency["name"],
        client_id=created_agency["client_id"],
        rate_card_file=created_agency.get("rate_card_file"),
        created_by=created_agency["created_by"],
        created_at=created_agency["created_at"]
    )

@router.get("/agencies", response_model=List[Agency])
async def read_agencies(client_id: Optional[str] = None):
    """Get all agencies, optionally filtered by client_id (no authorization required during development)"""
    query = {}
    if client_id:
        query["client_id"] = client_id  # this is client_code
    
    agencies = []
    async for agency in agencies_collection.find(query):
        agencies.append(Agency(
            id=str(agency["_id"]),
            agency_code=agency["agency_code"],
            name=agency["name"],
            client_id=agency["client_id"],
            rate_card_file=agency.get("rate_card_file"),
            created_by=agency["created_by"],
            created_at=agency["created_at"]
        ))
    return agencies

@router.get("/agencies/{agency_code}", response_model=Agency)
async def read_agency(agency_code: str):
    """Get an agency by business code (no authorization required during development)"""
    if (agency := await agencies_collection.find_one({"agency_code": agency_code})) is not None:
        return Agency(
            id=str(agency["_id"]),
            agency_code=agency["agency_code"],
            name=agency["name"],
            client_id=agency["client_id"],
            rate_card_file=agency.get("rate_card_file"),
            created_by=agency["created_by"],
            created_at=agency["created_at"]
        )
    raise HTTPException(status_code=404, detail="Agency not found")

# Invoice endpoints
@router.post("/invoices", response_model=Invoice)
async def create_invoice(invoice_data: InvoiceCreate):
    """Create a new invoice (no authorization required during development)"""
    # Check if agency exists (invoice_data.agency_id is agency_code)
    if not await agencies_collection.find_one({"agency_code": invoice_data.agency_id}):
        raise HTTPException(status_code=400, detail="Agency not found")
    
    # Check if client exists
    if not await clients_collection.find_one({"client_code": invoice_data.client_id}):
        raise HTTPException(status_code=400, detail="Client not found")
    
    # For development, use a default created_by value
    default_user = await users_collection.find_one()
    created_by_id = str(default_user["_id"]) if default_user else "development_user"
    
    # Create invoice document
    invoice_in_db = InvoiceInDB(
        **invoice_data.dict(),
        created_by=created_by_id
    )
    
    # Insert into database
    result = await invoices_collection.insert_one(invoice_in_db.dict(exclude={"id"}))
    
    # Return created invoice
    created_invoice = await invoices_collection.find_one({"_id": result.inserted_id})
    
    return Invoice(
        id=str(created_invoice["_id"]),
        agency_id=created_invoice["agency_id"],
        client_id=created_invoice["client_id"],
        agency_invoice=created_invoice.get("agency_invoice"),
        approved_actualized_plan=created_invoice.get("approved_actualized_plan"),
        job_order=created_invoice.get("job_order"),
        booking_order=created_invoice.get("booking_order"),
        vendor_invoice=created_invoice.get("vendor_invoice"),
        ad_appearance_proofs=created_invoice.get("ad_appearance_proofs", []),
        other_documents=created_invoice.get("other_documents", []),
        created_by=created_invoice["created_by"],
        created_at=created_invoice["created_at"]
    )

@router.get("/invoices", response_model=List[Invoice])
async def read_invoices(
    agency_id: Optional[str] = None,
    client_id: Optional[str] = None
):
    """Get all invoices, optionally filtered by agency_id or client_id (no authorization required during development)"""
    query = {}
    if agency_id:
        query["agency_id"] = agency_id  # agency_code
    if client_id:
        query["client_id"] = client_id  # client_code
    
    invoices = []
    async for invoice in invoices_collection.find(query):
        invoices.append(Invoice(
            id=str(invoice["_id"]),
            agency_id=invoice["agency_id"],
            client_id=invoice["client_id"],
            agency_invoice=invoice.get("agency_invoice"),
            approved_actualized_plan=invoice.get("approved_actualized_plan"),
            job_order=invoice.get("job_order"),
            booking_order=invoice.get("booking_order"),
            vendor_invoice=invoice.get("vendor_invoice"),
            ad_appearance_proofs=invoice.get("ad_appearance_proofs", []),
            other_documents=invoice.get("other_documents", []),
            created_by=invoice["created_by"],
            created_at=invoice["created_at"]
        ))
    return invoices

@router.get("/invoices/{invoice_id}", response_model=Invoice)
async def read_invoice(invoice_id: str):
    """Get an invoice by ID (no authorization required during development)"""
    try:
        object_id = ObjectId(invoice_id)
    except:
        raise HTTPException(status_code=400, detail="Invalid invoice ID format")
    
    if (invoice := await invoices_collection.find_one({"_id": object_id})) is not None:
        return Invoice(
            id=str(invoice["_id"]),
            agency_id=invoice["agency_id"],
            client_id=invoice["client_id"],
            agency_invoice=invoice.get("agency_invoice"),
            approved_actualized_plan=invoice.get("approved_actualized_plan"),
            job_order=invoice.get("job_order"),
            booking_order=invoice.get("booking_order"),
            vendor_invoice=invoice.get("vendor_invoice"),
            ad_appearance_proofs=invoice.get("ad_appearance_proofs", []),
            other_documents=invoice.get("other_documents", []),
            created_by=invoice["created_by"],
            created_at=invoice["created_at"]
        )
    raise HTTPException(status_code=404, detail="Invoice not found")

# File upload endpoints
@router.post("/upload/{document_type}/{entity_id}")
async def upload_file(
    document_type: str,
    entity_id: str,
    file: UploadFile = File(...)
):
    """Upload a file for a specific document type and entity (no authorization required during development)"""
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
        raise HTTPException(status_code=400, detail=f"Invalid document type. Must be one of: {', '.join(valid_document_types)}")
    
    # Create directory structure
    upload_dir = ensure_upload_dir(f"uploads/{document_type}")
    
    # Create unique filename with timestamp
    import time
    timestamp = int(time.time())
    filename = f"{entity_id}_{document_type}_{timestamp}_{file.filename}"
    file_path = f"uploads/{document_type}/{filename}"
    
    # Save the file
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    # If this is a rate card upload, persist the reference on the corresponding entity
    if document_type == "rate_card":
        # Try update client by client_code
        await clients_collection.find_one_and_update(
            {"client_code": entity_id},
            {"$set": {"rate_card_file": filename}}
        )
        if not await clients_collection.find_one({"client_code": entity_id}):
            # Try update agency by agency_code
            await agencies_collection.find_one_and_update(
                {"agency_code": entity_id},
                {"$set": {"rate_card_file": filename}}
            )

    return {"filename": filename, "file_path": file_path}

# Folder status endpoint
@router.get("/agencies/{agency_code}/folders/status")
async def get_agency_folder_status(agency_code: str):
    """Get the status of all document folders for an agency"""
    # Check if agency exists
    agency = await agencies_collection.find_one({"agency_code": agency_code})
    if not agency:
        raise HTTPException(status_code=404, detail="Agency not found")
    
    # Define core folders
    core_folders = [
        {"type": "agency_invoice", "name": "Agency Invoice", "icon": "📄", "is_custom": False},
        {"type": "approved_quotation", "name": "Approved Quotation", "icon": "✅", "is_custom": False},
        {"type": "job_order", "name": "Job Order (JO)", "icon": "📋", "is_custom": False},
        {"type": "timesheet", "name": "Timesheet", "icon": "⏰", "is_custom": False},
        {"type": "third_party", "name": "Third Party", "icon": "🤝", "is_custom": False},
        {"type": "proof_screenshot", "name": "Proof of Screenshot of performance", "icon": "📸", "is_custom": False},
        {"type": "tracker", "name": "Tracker", "icon": "📈", "is_custom": False},
    ]
    
    # Get custom folders from agency document
    custom_folders = agency.get("custom_folders", [])
    
    # Combine core and custom folders
    all_folders = core_folders + custom_folders
    
    # Check file status for each folder
    folder_status = []
    for folder in all_folders:
        folder_type = folder["type"]
        
        # Check if files exist for this folder type
        upload_dir = Path(f"uploads/{folder_type}")
        if upload_dir.exists():
            # Find files that match the agency code pattern
            pattern = f"{agency_code}_{folder_type}_*"
            files = list(upload_dir.glob(pattern))
            file_count = len(files)
            file_names = [f.name for f in files]
        else:
            file_count = 0
            file_names = []
        
        folder_status.append({
            **folder,
            "file_count": file_count,
            "file_names": file_names,
            "has_files": file_count > 0
        })
    
    return {
        "agency_code": agency_code,
        "folders": folder_status
    }

# Custom folder creation endpoint
@router.post("/agencies/{agency_code}/folders")
async def create_custom_folder(agency_code: str, folder_data: dict):
    """Create a custom folder for an agency"""
    # Check if agency exists
    agency = await agencies_collection.find_one({"agency_code": agency_code})
    if not agency:
        raise HTTPException(status_code=404, detail="Agency not found")
    
    folder_type = folder_data.get("type")
    folder_name = folder_data.get("name")
    
    if not folder_type or not folder_name:
        raise HTTPException(status_code=400, detail="Folder type and name are required")
    
    # Validate folder type format (alphanumeric and underscores only)
    if not re.match(r'^[a-zA-Z0-9_]+$', folder_type):
        raise HTTPException(status_code=400, detail="Folder type must contain only letters, numbers, and underscores")
    
    # Check if folder already exists (core or custom)
    core_folders = ["agency_invoice", "approved_quotation", "job_order", "timesheet", "third_party", "proof_screenshot", "tracker"]
    if folder_type in core_folders:
        raise HTTPException(status_code=400, detail="Cannot create folder with reserved name")
    
    # Check if custom folder already exists
    existing_custom_folders = agency.get("custom_folders", [])
    if any(f["type"] == folder_type for f in existing_custom_folders):
        raise HTTPException(status_code=400, detail="Custom folder already exists")
    
    # Create the custom folder
    custom_folder = {
        "type": folder_type,
        "name": folder_name,
        "icon": folder_data.get("icon", "📁"),
        "created_at": datetime.utcnow(),
        "is_custom": True
    }
    
    # Add to agency document
    await agencies_collection.update_one(
        {"agency_code": agency_code},
        {"$push": {"custom_folders": custom_folder}}
    )
    
    return {"message": f"Folder '{folder_name}' created successfully", "folder": custom_folder}

# Custom folder deletion endpoint
@router.delete("/agencies/{agency_code}/folders/{folder_type}")
async def delete_custom_folder(agency_code: str, folder_type: str):
    """Delete a custom folder for an agency"""
    # Check if agency exists
    agency = await agencies_collection.find_one({"agency_code": agency_code})
    if not agency:
        raise HTTPException(status_code=404, detail="Agency not found")
    
    # Check if it's a core folder (cannot delete)
    core_folders = ["agency_invoice", "approved_quotation", "job_order", "timesheet", "third_party", "proof_screenshot", "tracker"]
    if folder_type in core_folders:
        raise HTTPException(status_code=400, detail="Cannot delete core folders")
    
    # Check if custom folder exists
    existing_custom_folders = agency.get("custom_folders", [])
    folder_to_delete = next((f for f in existing_custom_folders if f["type"] == folder_type), None)
    
    if not folder_to_delete:
        raise HTTPException(status_code=404, detail="Custom folder not found")
    
    # Check if folder has files (cannot delete if it has files)
    upload_dir = Path(f"uploads/{folder_type}")
    if upload_dir.exists():
        pattern = f"{agency_code}_{folder_type}_*"
        files = list(upload_dir.glob(pattern))
        if files:
            raise HTTPException(status_code=400, detail="Cannot delete folder that contains files")
    
    # Remove from agency document
    await agencies_collection.update_one(
        {"agency_code": agency_code},
        {"$pull": {"custom_folders": {"type": folder_type}}}
    )
    
    return {"message": f"Folder '{folder_to_delete['name']}' deleted successfully"}

# Dashboard statistics endpoint
@router.get("/dashboard/stats")
async def get_dashboard_stats():
    """Get dashboard statistics including total clients, agencies, jobs, and pending jobs"""
    try:
        # Count total clients
        total_clients = await clients_collection.count_documents({})
        
        # Count total agencies
        total_agencies = await agencies_collection.count_documents({})
        
        # Count total jobs (these are the invoices/jobs)
        total_jobs = await jobs_collection.count_documents({})
        
        # Count compliant jobs
        compliant_jobs = await jobs_collection.count_documents({
            "status": "Compliant"
        })
        
        # Count non-compliant jobs
        non_compliant_jobs = await jobs_collection.count_documents({
            "status": "Not Compliant"
        })
        
        return {
            "total_clients": total_clients,
            "total_agencies": total_agencies,
            "total_invoices": total_jobs,
            "compliant_jobs": compliant_jobs,
            "non_compliant_jobs": non_compliant_jobs
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching dashboard stats: {str(e)}")