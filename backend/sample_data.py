import asyncio
import os
from datetime import datetime
from bson import ObjectId
from auth import get_password_hash
from db import (
    init_db, users_collection, clients_collection, agencies_collection,
    jobs_collection
)
from models import Role, JobStatus, Document, JobChecklist
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import letter

async def create_comprehensive_test_job():
    """Create a single, comprehensive job with a full checklist and review."""
    print("Creating comprehensive test job...")

    # Ensure DB is initialized
    await init_db()
    
    # --- Clean the jobs collection ---
    await jobs_collection.delete_many({})
    print("Cleaned existing jobs.")

    # --- Get or Create User, Client, Agency ---
    admin_user = await users_collection.find_one({"username": "admin"})
    admin_id = admin_user['_id'] if admin_user else await users_collection.insert_one({
        "username": "admin", "email": "admin@example.com", 
        "hashed_password": get_password_hash("admin"), "role": "admin"
    }).inserted_id

    client = await clients_collection.find_one()
    client_id = client['_id'] if client else await clients_collection.insert_one(
        {"name": "Main Client", "client_code": "CLT-MAIN"}
    ).inserted_id

    agency = await agencies_collection.find_one()
    agency_id = agency['_id'] if agency else await agencies_collection.insert_one(
        {"name": "Main Agency", "agency_code": "AGY-MAIN", "client_id": str(client_id)}
    ).inserted_id

    # --- Create all sample PDF files ---
    upload_dir = "uploads"
    invoice_dir = os.path.join(upload_dir, "agency_invoice")
    job_order_dir = os.path.join(upload_dir, "job_order")
    os.makedirs(invoice_dir, exist_ok=True)
    os.makedirs(job_order_dir, exist_ok=True)

    # Invoice 1
    inv1_path = os.path.join(invoice_dir, "comprehensive_invoice_1.pdf")
    c = canvas.Canvas(inv1_path, pagesize=letter)
    c.drawString(100, 750, "Invoice: INV-001 | Campaign: Asia Bridging Cultures | Amount: 799999")
    c.save()

    # Job Order
    jo_path = os.path.join(job_order_dir, "comprehensive_job_order.pdf")
    c = canvas.Canvas(jo_path, pagesize=letter)
    c.drawString(100, 750, "Job Order: PO-102926-2024 | Total: 933800")
    c.save()

    # --- Build the job data ---
    job_data = {
        "agency_id": str(agency_id),
        "title": "Comprehensive Test Job",
        "description": "A single job with a full review and checklist.",
        "start_date": datetime.utcnow(),
        "end_date": datetime.utcnow(),
        "status": "pending",
        "review": {
            "market_bu": "MENA",
            "agency_invoice_number": "PR24|71-30%, PR25|80-20%",
            "po_number": "PO-102926-2024",
            "period_month": "Sep 2024 - Apr 2025",
            "date_invoice_sent_to_medpush": datetime(2025, 6, 26),
            "medium": "Influencers",
            "campaign_name": "Asia Bridging Cultures",
            "net_media_cost": 799999.0,
            "agency_fee": 12000.0,
            "taxes": 121800.0,
            "other_third_party_cost": 0.0,
            "agency_invoice_total_amount": 933799.0,
            "media_plan_total_amount": 933799.0,
            "po_amount_with_af": 933800.0,
            "initial_review_outcome": "1- the agency invoice for 50% has not been attached",
            "final_review_outcome": "Not Approved"
        },
        "checklist": {
            "agency_invoice": [
                Document(file_path=inv1_path, original_filename="comprehensive_invoice_1.pdf").dict(),
            ],
            "job_order": [
                Document(file_path=jo_path, original_filename="comprehensive_job_order.pdf").dict()
            ]
        },
        "created_by": str(admin_id),
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow()
    }
    
    result = await jobs_collection.insert_one(job_data)
    print(f"Created comprehensive job with ID: {result.inserted_id}")

if __name__ == "__main__":
    asyncio.run(create_comprehensive_test_job())
