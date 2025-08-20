'''
This file defines the API routes for reporting functionalities, such as fetching all jobs for report generation.
'''

from fastapi import APIRouter, Depends, HTTPException, status, Query
from typing import List
from fastapi.responses import StreamingResponse
import pandas as pd
import io

from models import Job
from db import jobs_collection

router = APIRouter()


@router.get("/reports/jobs", response_model=List[Job])
async def get_jobs_for_agency(agency_id: str = Query(...)):
    """
    Retrieve all jobs for a specific agency for reporting purposes.
    """
    jobs_cursor = jobs_collection.find({"agency_id": agency_id})
    jobs = []
    
    async for job_data in jobs_cursor:
        job_data["id"] = str(job_data["_id"])
        jobs.append(Job(**job_data))
    return jobs

@router.get("/reports/jobs/csv", summary="Generate CSV report for jobs by agency ID", tags=["Reports"])
async def generate_jobs_csv_report(agency_id: str = Query(..., description="The ID of the agency to generate the report for.")):
    """
    Generates a CSV report of jobs filtered by agency ID, including detailed review and checklist information.
    """
    jobs_cursor = jobs_collection.find({"agency_id": agency_id})
    jobs_data = []

    async for job_data_db in jobs_cursor:
        job_id = str(job_data_db["_id"])
        job_data = Job(**{**job_data_db, "id": job_id}).model_dump()

        # Flatten the job data for CSV report
        flattened_job = {
            "job_id": job_data["id"],
            "agency_id": job_data["agency_id"],
            "title": job_data["title"],
            "description": job_data["description"],
            "start_date": job_data["start_date"].isoformat() if job_data.get("start_date") else None,
            "end_date": job_data["end_date"].isoformat() if job_data.get("end_date") else None,
            "status": job_data["status"],
            "created_by": job_data["created_by"],
            "created_at": job_data["created_at"].isoformat() if job_data.get("created_at") else None,
            "updated_at": job_data["updated_at"].isoformat() if job_data.get("updated_at") else None,
        }

        review = job_data.get("review", {})
        if review:
            flattened_job.update({
                "market_bu": review.get("market_bu"),
                "agency_invoice_number": review.get("agency_invoice_number"),
                "po_number": review.get("po_number"),
                "period_month": review.get("period_month"),
                "date_invoice_sent_to_medpush": review.get("date_invoice_sent_to_medpush").isoformat() if review.get("date_invoice_sent_to_medpush") else None,
                "date_medpush_shared_feedback": review.get("date_medpush_shared_feedback").isoformat() if review.get("date_medpush_shared_feedback") else None,
                "date_agency_responded_to_feedback": review.get("date_agency_responded_to_feedback").isoformat() if review.get("date_agency_responded_to_feedback") else None,
                "date_medpush_approved_invoice": review.get("date_medpush_approved_invoice").isoformat() if review.get("date_medpush_approved_invoice") else None,
                "medium": review.get("medium"),
                "campaign_name": review.get("campaign_name"),
                "net_media_cost": review.get("net_media_cost"),
                "agency_fee": review.get("agency_fee"),
                "taxes": review.get("taxes"),
                "other_third_party_cost": review.get("other_third_party_cost"),
                "agency_invoice_total_amount": review.get("agency_invoice_total_amount"),
                "media_plan_total_amount": review.get("media_plan_total_amount"),
                "po_amount_with_af": review.get("po_amount_with_af"),
                "initial_review_outcome": review.get("initial_review_outcome"),
                "agency_feedback_action": review.get("agency_feedback_action"),
                "final_review_outcome": review.get("final_review_outcome"),
                "status_of_received_invoices": review.get("status_of_received_invoices"),
                "month_medpush_received_invoice": review.get("month_medpush_received_invoice"),
                "days_medpush_to_review_and_share_feedback": review.get("days_medpush_to_review_and_share_feedback"),
                "days_agency_to_revert_to_medpush": review.get("days_agency_to_revert_to_medpush"),
                "days_medpush_to_approve_after_revision": review.get("days_medpush_to_approve_after_revision"),
            })
            if review.get("raw_ai_invoice_output"):
                flattened_job["raw_ai_invoice_total_amount"] = review["raw_ai_invoice_output"].get("summary", {}).get("total_amount")
                flattened_job["raw_ai_invoice_details"] = review["raw_ai_invoice_output"].get("summary", {}).get("agency_invoice_details")
                flattened_job["raw_ai_invoice_file_names"] = ", ".join(review["raw_ai_invoice_output"].get("summary", {}).get("file_names", []))
            if review.get("raw_ai_po_output"):
                flattened_job["raw_ai_po_number"] = review["raw_ai_po_output"].get("po_number")
                flattened_job["raw_ai_po_amount"] = review["raw_ai_po_output"].get("po_amount")

        checklist = job_data.get("checklist", {})
        if checklist:
            flattened_job.update({
                "checklist_agency_invoice": ", ".join([doc.get("original_filename", "") for doc in checklist.get("agency_invoice", [])]),
                "checklist_approved_quotation": ", ".join([doc.get("original_filename", "") for doc in checklist.get("approved_quotation", [])]),
                "checklist_job_order": ", ".join([doc.get("original_filename", "") for doc in checklist.get("job_order", [])]),
                "checklist_timesheet": ", ".join([doc.get("original_filename", "") for doc in checklist.get("timesheet", [])]),
                "checklist_third_party": ", ".join([doc.get("original_filename", "") for doc in checklist.get("third_party", [])]),
                "checklist_performance_proof": ", ".join([doc.get("original_filename", "") for doc in checklist.get("performance_proof", [])]),
            })
        jobs_data.append(flattened_job)

    if not jobs_data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"No jobs found for agency ID: {agency_id}")

    df = pd.DataFrame(jobs_data)

    # Convert DataFrame to CSV
    csv_buffer = io.StringIO()
    df.to_csv(csv_buffer, index=False)
    csv_buffer.seek(0)

    return StreamingResponse(
        csv_buffer,
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=jobs_report_{agency_id}.csv"}
    )
