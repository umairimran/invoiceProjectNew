"""
AI Processing Module for Document Analysis and Data Extraction

This module handles all AI-related document processing tasks for the application.
It provides functions to extract text from documents and parse that text into structured data.
"""

import os
import re
import json
from typing import Dict, Any, List, Optional, Tuple
from datetime import datetime
import tempfile
import io

import pdfplumber
from dotenv import load_dotenv
from google import genai
from google.genai import types
import openpyxl
import pandas as pd
import logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)
# Import these libraries when you're ready to implement the functions
# import pytesseract
# from PIL import Image
# import pdfplumber
# import cv2
# import numpy as np

# Constants
UPLOAD_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "uploads")

# Local file storage (backend/uploads/) - no AWS required
def get_file_from_local(relative_path: str) -> bytes:
    """
    Read file content from local uploads directory (backend/uploads/).
    relative_path: e.g. uploads/jobs/{job_id}/agency_invoice/file.pdf
    """
    from local_storage import read_file as local_read
    try:
        return local_read(relative_path)
    except Exception as e:
        logger.error(f"Error reading file from local storage {relative_path}: {e}")
        raise


def read_pdf_from_s3(file_path: str) -> str:
    """
    Read PDF content from local storage and extract text.
    file_path: relative path e.g. uploads/jobs/.../file.pdf
    """
    try:
        file_content = get_file_from_local(file_path)
        with pdfplumber.open(io.BytesIO(file_content)) as pdf:
            text = ""
            for page in pdf.pages:
                page_text = page.extract_text() or ""
                text += page_text + "\n"
            return text.strip()
    except Exception as e:
        logger.error(f"Error reading PDF {file_path}: {e}")
        raise


def read_excel_from_s3(file_path: str) -> Optional[List[List[Any]]]:
    """
    Read Excel content from local storage and return as list of lists.
    file_path: relative path e.g. uploads/jobs/.../file.xlsx
    """
    try:
        file_content = get_file_from_local(file_path)
        df = pd.read_excel(io.BytesIO(file_content), sheet_name=0, header=None)
        return df.values.tolist()
    except Exception as e:
        logger.error(f"Error reading Excel {file_path}: {e}")
        return None

# Main AI processing function
def process_job_documents(job: Dict[str, Any]) -> Dict[str, Any]:
    """
    Main function to process all documents for a job.
    This is the entry point for the AI processing pipeline.
    
    Args:
        job: The job document from MongoDB
        
    Returns:
        Dict containing extracted data to update the job's review field
    """
    extracted_data = {}
    
    # Check if job has documents in checklist
    if not job.get("checklist"):
        return extracted_data
    
    # Process each document type
    for folder_type, documents in job["checklist"].items():
        if not documents:
            continue
            
        folder_data = process_folder_documents(folder_type, documents, str(job["_id"]))
        extracted_data.update(folder_data)
    
    # Post-process the extracted data (e.g., calculate totals, validate data)
    post_process_data(extracted_data)
    
    return extracted_data


def process_folder_documents(folder_type: str, documents: List[Dict], job_id: str) -> Dict[str, Any]:
    """
    Process all documents in a specific folder type.
    
    Args:
        folder_type: Type of folder (e.g., "agency_invoice")
        documents: List of document objects
        job_id: ID of the job
        
    Returns:
        Dict containing extracted data from these documents
    """
    extracted_data = {}
    
    from local_storage import get_local_path
    for doc in documents:
        # Resolve relative path (uploads/jobs/.../file.pdf) to backend absolute path
        relative_path = doc.get("file_path")
        if not relative_path or not isinstance(relative_path, str):
            continue
        full_path = get_local_path(relative_path)
        if not full_path.is_file():
            print(f"File not found: {full_path}")
            continue
        file_path = str(full_path)
        # Extract text from the document
        text = extract_text_from_document(file_path)
        if not text:
            continue
            
        # Parse the text based on folder type
        if folder_type == "agency_invoice":
            data = parse_agency_invoice(text)
        elif folder_type == "approved_quotation":
            data = parse_approved_quotation(text)
        elif folder_type == "job_order":
            data = parse_job_order(text)
        elif folder_type == "timesheet":
            data = parse_timesheet(text)
        elif folder_type == "third_party":
            data = parse_third_party(text)
        elif folder_type == "performance_proof":
            data = parse_performance_proof(text)
        else:
            data = {}
            
        # Merge the extracted data
        extracted_data.update(data)
    
    return extracted_data


def extract_text_from_document(file_path: str) -> str:
    """
    Extract text from a document file.
    
    Args:
        file_path: Path to the document file
        
    Returns:
        Extracted text as a string
    """
    # Determine file type by extension
    file_extension = os.path.splitext(file_path)[1].lower()
    
    # Extract text based on file type
    if file_extension == '.pdf':
        return extract_text_from_pdf(file_path)
    elif file_extension in ['.jpg', '.jpeg', '.png']:
        return extract_text_from_image(file_path)
    else:
        print(f"Unsupported file type: {file_extension}")
        return ""


def extract_text_from_pdf(file_path: str) -> str:
    """
    Extract text from a PDF file.
    
    Args:
        file_path: Path to the PDF file
        
    Returns:
        Extracted text as a string
    """
    # TODO: Implement this function using a PDF library like pdfplumber
    # Example implementation:
    # with pdfplumber.open(file_path) as pdf:
    #     text = ""
    #     for page in pdf.pages:
    #         page_text = page.extract_text() or ""
    #         text += page_text + "\n"
    #     return text
    
    # For now, return a placeholder
    print(f"Extracting text from PDF: {file_path}")
    return f"This is placeholder text from PDF {os.path.basename(file_path)}"


def extract_text_from_image(file_path: str) -> str:
    """
    Extract text from an image file using OCR.
    
    Args:
        file_path: Path to the image file
        
    Returns:
        Extracted text as a string
    """
    # TODO: Implement this function using an OCR library like pytesseract
    # Example implementation:
    # image = Image.open(file_path)
    # text = pytesseract.image_to_string(image)
    # return text
    
    # For now, return a placeholder
    print(f"Extracting text from image: {file_path}")
    return f"This is placeholder text from image {os.path.basename(file_path)}"


# Document-specific parsers
def parse_agency_invoice(text: str) -> Dict[str, Any]:
    """
    Parse text from an agency invoice document.
    
    Args:
        text: Extracted text from the document
        
    Returns:
        Dict containing extracted fields
    """
    extracted_data = {}
    
    # TODO: Implement regex patterns to extract specific fields
    # Example patterns:
    
    # Extract Agency Invoice Number
    invoice_match = re.search(r"Invoice\s*(?:No|Number|#)?\s*[:#]?\s*([A-Za-z0-9|_-]+)", text, re.IGNORECASE)
    if invoice_match:
        extracted_data["agency_invoice_number"] = invoice_match.group(1).strip()
    
    # Extract PO Number
    po_match = re.search(r"P\.?O\.?\s*(?:No|Number|#)?\s*[:#]?\s*([A-Za-z0-9\s]+)", text, re.IGNORECASE)
    if po_match:
        extracted_data["po_number"] = po_match.group(1).strip()
    
    # Extract Invoice Total Amount
    amount_match = re.search(r"Total\s*(?:Amount|Sum)?\s*[:#]?\s*(?:SAR|SR)?\s*([\d,\.]+)", text, re.IGNORECASE)
    if amount_match:
        amount_str = amount_match.group(1).replace(",", "")
        try:
            extracted_data["agency_invoice_total_amount"] = float(amount_str)
        except ValueError:
            pass
    
    # TODO: Add more regex patterns for other fields
    
    return extracted_data


def parse_approved_quotation(text: str) -> Dict[str, Any]:
    """Parse text from an approved quotation document."""
    # TODO: Implement this function
    return {}


def parse_job_order(text: str) -> Dict[str, Any]:
    """Parse text from a job order document."""
    # TODO: Implement this function
    return {}


def parse_timesheet(text: str) -> Dict[str, Any]:
    """Parse text from a timesheet document."""
    # TODO: Implement this function
    return {}


def parse_third_party(text: str) -> Dict[str, Any]:
    """Parse text from a third party document."""
    # TODO: Implement this function
    return {}


def parse_performance_proof(text: str) -> Dict[str, Any]:
    """Parse text from a performance proof document."""
    # TODO: Implement this function
    return {}


def post_process_data(data: Dict[str, Any]) -> None:
    """
    Post-process extracted data to ensure consistency and calculate derived fields.
    
    Args:
        data: Dict containing extracted data
        
    Returns:
        None (modifies data in-place)
    """
    # TODO: Implement data validation and post-processing
    # Example: Calculate total amount if components are available
    if all(key in data for key in ["net_media_cost", "agency_fee", "taxes"]):
        try:
            net_media_cost = float(data["net_media_cost"])
            agency_fee = float(data["agency_fee"])
            taxes = float(data["taxes"])
            
            # If other_third_party_cost is not available, default to 0
            other_cost = float(data.get("other_third_party_cost", 0))
            
            # Calculate total
            total = net_media_cost + agency_fee + taxes + other_cost
            
            # Only set if not already extracted
            if "agency_invoice_total_amount" not in data:
                data["agency_invoice_total_amount"] = total
        except (ValueError, TypeError):
            pass


def validate_job_checklist(job: Dict[str, Any]) -> Dict[str, any]:
    """
    Validates the documents in the job's checklist against predefined rules.

    Args:
        job: The job document from MongoDB.

    Returns:
        A dictionary containing validation results:
        - is_compliant: boolean indicating if all requirements are met
        - missing_items: list of strings indicating missing or incorrect items
        - initial_review_outcome: text describing the validation result
        - final_review_outcome: "Compliant" or "Non-Compliant"
    """
    missing_items = []
    checklist = job.get("checklist", {})

    # Check 1: Agency Invoice - must have 3 files (representing 20%, 30%, 50%)
    agency_invoices = checklist.get("agency_invoice", [])
    if len(agency_invoices) != 3:
        if len(agency_invoices) == 0:
            missing_items.append("1- the agency invoice for 20% has not been attached")
            missing_items.append("2- the agency invoice for 30% has not been attached")
            missing_items.append("3- the agency invoice for 50% has not been attached")
        elif len(agency_invoices) == 1:
            missing_items.append("2- the agency invoice for 30% has not been attached")
            missing_items.append("3- the agency invoice for 50% has not been attached")
        elif len(agency_invoices) == 2:
            missing_items.append("3- the agency invoice for 50% has not been attached")

    # Check 2: Approved Quotation - must have 2 documents
    approved_quotations = checklist.get("approved_quotation", [])
    if len(approved_quotations) != 2:
        if len(approved_quotations) == 0:
            missing_items.append("4- the approved quotation documents have not been attached")
        elif len(approved_quotations) == 1:
            missing_items.append("5- one approved quotation document is missing")

    # Check 3: Job Order - must have 1 document
    job_orders = checklist.get("job_order", [])
    if len(job_orders) != 1:
        if len(job_orders) == 0:
            missing_items.append("6- the job order has not been attached")
        else:
            missing_items.append("7- multiple job orders found, only one is required")

    # Check 4: Proof of Ads - must not be empty
    print("Checklist:", checklist)
    proof_of_ads = checklist.get("performance_proof", [])
    if not proof_of_ads or len(proof_of_ads) == 0:
        missing_items.append("8- the proof of ads (performance proof) has not been attached")
    print("Proof of Ads:", proof_of_ads)
    print("Missing items:", missing_items)
    # Determine overall compliance
    is_compliant = len(missing_items) == 0

    # Set review outcomes
    if is_compliant:
        initial_review_outcome = "All required documents are present and valid."
        final_review_outcome = "Approved"
    else:
        missing_items_text = "; ".join(missing_items)
        initial_review_outcome = f"Missing or incorrect documents: {missing_items_text}"
        final_review_outcome = "Not Approved"
    print("Initial review outcome:", initial_review_outcome)
    return {
        "is_compliant": is_compliant,
        "missing_items": missing_items,
        "initial_review_outcome": initial_review_outcome,
        "final_review_outcome": final_review_outcome
    }
def gemini_api_function(prompt: str, schema: dict):
    import os
    from dotenv import load_dotenv
    from google import genai
    from google.genai import types

    # Load environment variables
    load_dotenv()

    # Initialize client with API key (GOOGLE_API_KEY or GEMINI_API_KEY in .env)
    api_key = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")
    client = genai.Client(api_key=api_key)

    # Use gemini-2.5-flash-lite (same as generativelanguage.googleapis.com/v1/models/gemini-2.5-flash-lite)
    model = "gemini-2.5-flash-lite"

    # Generate structured output
    response = client.models.generate_content(
        model=model,
        contents=prompt,
        config=types.GenerateContentConfig(
            response_mime_type="application/json",  # Force JSON
            response_schema=schema                  # Apply schema
        )
    )

    return response.parsed  # This will be a Python dict (valid JSON)

def extract_agency_details_from_invoices(
    invoices_text_extracted: List[str], agency_invoices: List[Dict[str, Any]]
) -> Dict[str, Any]:
    if len(invoices_text_extracted) < 3:
        logger.warning("Received fewer than 3 invoices. Returning fallback response.")
        return {
            "status": "fallback",
            "message": "Cannot process AI details with less than three invoices.",
            "invoices": [],
            "summary": {}
        }

    invoice_schema = {
        "type": "object",
        "properties": {
            "agency_invoice_number": {"type": "string"},
            "project_code": {"type": "string", "description": "e.g., PR24|71-30%"},
            "campaign_name": {"type": "string"},
            "total_amount": {"type": "number"},
            "percentage": {
                "type": "string",
                "description": "Must be one of: 20%, 30%, 50%",
                "enum": ["20%", "30%", "50%"]
            }
        },
        "required": [
            "agency_invoice_number",
            "project_code",
            "campaign_name",
            "total_amount"
        ]
    }

    extracted_details_list: List[Dict[str, Any]] = []
    total_amount: float = 0.0
    invoice_details: List[str] = []
    file_names: List[str] = []

    for i, text in enumerate(invoices_text_extracted):
        invoice_doc = agency_invoices[i] if i < len(agency_invoices) else {}
        original_file_name = invoice_doc.get(
            "original_filename",
            invoice_doc.get("file_path", f"invoice_{i+1}.pdf")
        )
        file_names.append(original_file_name)

        prompt = (
            f"Extract the following details from the invoice text. "
            f"The original invoice file name is '{original_file_name}'.\n\n"
            "The 'invoice percentage' MUST be one of: 20%, 30%, or 50%.\n\n"
            "Search order:\n"
            "1. Check the file name for 20%, 30%, or 50%.\n"
            "2. If not in file name, check the invoice text.\n\n"
            "Return the first valid value found. "
            "If none are found, do not return a percentage.\n\n"
            "Invoice text:\n---\n"
            f"{text}\n---"
        )

        try:
            details = gemini_api_function(prompt, invoice_schema)
            if not all(k in details for k in invoice_schema["required"]):
                raise ValueError(f"Incomplete details returned: {details}")
            details["file_name"] = original_file_name
            extracted_details_list.append(details)
            total_amount += float(details.get("total_amount", 0) or 0)
            if details.get("agency_invoice_number") and details.get("percentage"):
                invoice_details.append(
                    f"{details['agency_invoice_number']} - {details['percentage']}"
                )
        except Exception as e:
            logger.exception(
                f"Error processing invoice '{original_file_name}' with Gemini API."
            )
            extracted_details_list.append({
                "file_name": original_file_name,
                "error": str(e)
            })

    return {
        "status": "success",
        "invoices": extracted_details_list,
        "summary": {
            "total_amount": total_amount,
            "agency_invoice_details": ", ".join(invoice_details),
            "file_names": file_names
        }
    }
def extract_po_details_from_job_order(job_order_docs: list):
    if not job_order_docs:
        return {}

    # Assuming the first document is the correct one
    job_order_doc = job_order_docs[0]
    file_path = job_order_doc.get("file_path")
    original_file_name = job_order_doc.get("original_filename", file_path)

    if not file_path:
        return {}

    # Extract text from the PDF using S3
    try:
        text = read_pdf_from_s3(file_path)
    except Exception as e:
        print(f"Error processing {file_path}: {e}")
        return {"error": f"Failed to read PDF {original_file_name}"}

    po_schema = {
        "type": "object",
        "properties": {
            "po_number": {"type": "string", "description": "The Purchase Order (PO) number, sometimes referred to as Job Order number."},
            "po_amount": {"type": "number", "description": "The total amount of the Purchase Order."},
        },
        "required": ["po_number", "po_amount"]
    }

    prompt = f"""
    Please analyze the following text from a Job Order document (which is also a Purchase Order or PO).
    The original file name was '{original_file_name}'.

    Your task is to extract the following two key pieces of information:
    1.  **PO Number:** The unique identifier for the purchase order. It might be labeled as "PO Number", "Job Order #", "PO #", or similar.
    2.  **PO Amount:** The total financial value of the order. Look for labels like "Total Amount", "Grand Total", or "PO Amount".

    Please provide the extracted information in a structured JSON format.

    Document text:
    ---
    {text}
    ---
    """

    try:
        details = gemini_api_function(prompt, po_schema)
        return details
    except Exception as e:
        print(f"Error processing Job Order {original_file_name} with Gemini API: {e}")
        return {"error": f"AI processing failed for {original_file_name}"}

def extract_media_plan_details(approved_quotation_docs: list):
    """
    Given a list of approved_quotation_docs (each a dict with at least 'original_filename' and 'file_path'),
    this function identifies the correct media plan Excel file to use for AI extraction.

    The function will:
    - List all media plan Excel files found, with their names.
    - Use AI to determine which file is the "after job" (actualized) media plan, and which is the "before job" (approved) media plan,
      but NOT just by conventional naming, but by asking the AI to reason based on the file names and any available context.
    - Extract details ONLY from the "after job" (actualized) media plan.
    - If only one media plan is found, use that.
    - If none are found, return {}.
    - The input/output signature remains unchanged.
    """

    # Step 1: Find all media plan Excel files in approved_quotation_docs
    media_plan_files = []
    for doc in approved_quotation_docs:
        original_filename = doc.get("original_filename", "") or ""
        lower_filename = original_filename.lower()
        if "media plan" in lower_filename and lower_filename.endswith(('.xlsx', '.xls')):
            media_plan_files.append({
                "doc": doc,
                "original_filename": original_filename,
                "file_path": doc.get("file_path")
            })

    if not media_plan_files:
        print("Media plan Excel file not found in approved_quotation.")
        return {}

    # If only one media plan, use it
    if len(media_plan_files) == 1:
        selected_doc = media_plan_files[0]["doc"]
        selected_filename = media_plan_files[0]["original_filename"]
    else:
        # Step 2: Use AI to determine which file is the "after job" (actualized) media plan
        # Prepare a list of filenames for the prompt
        filenames_list = [f"{i+1}: {f['original_filename']}" for i, f in enumerate(media_plan_files)]
        filenames_text = "\n".join(filenames_list)

        ai_selection_prompt = f"""
You are given a list of media plan Excel files related to a job. The files may include:
- A media plan that was approved before the job started ("approved" or "pre-job" media plan)
- A media plan that was filled after the job was completed ("actualized" or "post-job" media plan)
The file names may contain words like "approved", "actualized", "final", "media plan", etc.

Here are the file names:
{filenames_text}

Your task:
- Use your reasoning and world knowledge to determine which file is the "after job" (actualized or post-job) media plan. 
- Do NOT rely only on conventional naming. If the names are ambiguous, use your best judgment and explain your reasoning.
- Respond in the following JSON format:
{{
  "after_job_media_plan_number": <number of the file that is the after-job (actualized) media plan, 1-based>,
  "explanation": "<brief explanation of your reasoning>"
}}
"""

        try:
            # Use Gemini or other LLM to select the correct file index (1-based) and provide reasoning
            ai_response = gemini_api_function(ai_selection_prompt, {
                "type": "object",
                "properties": {
                    "after_job_media_plan_number": {
                        "type": "integer",
                        "description": "The number (1-based) of the file that is the after-job (actualized) media plan."
                    },
                    "explanation": {
                        "type": "string",
                        "description": "A brief explanation of the reasoning for the selection."
                    }
                },
                "required": ["after_job_media_plan_number", "explanation"]
            })
            # Parse the response to get the index
            selected_index = None
            if isinstance(ai_response, dict) and "after_job_media_plan_number" in ai_response:
                try:
                    selected_index = int(ai_response["after_job_media_plan_number"]) - 1
                except Exception:
                    selected_index = 0
            else:
                selected_index = 0  # fallback

            if selected_index is None or not (0 <= selected_index < len(media_plan_files)):
                selected_index = 0  # fallback

            selected_doc = media_plan_files[selected_index]["doc"]
            selected_filename = media_plan_files[selected_index]["original_filename"]

            # Optionally, print or log the AI's explanation for audit
            explanation = ai_response.get("explanation", "")
            print(f"AI selected media plan file #{selected_index+1}: {selected_filename}. Reason: {explanation}")

        except Exception as e:
            print(f"Error selecting after-job media plan with AI: {e}")
            # Fallback: use the last file (often actualized/final)
            selected_doc = media_plan_files[-1]["doc"]
            selected_filename = media_plan_files[-1]["original_filename"]

    file_path = selected_doc.get("file_path")
    original_file_name = selected_doc.get("original_filename", file_path)

    excel_data = read_excel_from_s3(file_path)
    if not excel_data:
        return {"error": f"Failed to read Excel file {original_file_name}"}

    # Convert excel_data to a string format suitable for the prompt
    excel_text = ""
    for row in excel_data:
        excel_text += "\t".join([str(cell) if cell is not None else "" for cell in row]) + "\n"
    # Save the excel_text to a text file for inspection
    with open("media_plan_excel_text.txt", "w", encoding="utf-8") as f:
        f.write(excel_text)
    media_plan_schema = {
        "type": "object",
        "properties": {
            "medium": {"type": "string", "description": "Type of media (comma-separated if multiple)."},
            "net_media_cost": {"type": "number", "description": "Sum of net media costs."},
            "agency_fees": {"type": "number", "description": "Sum of agency fees."},
            "taxes_amount": {"type": "number", "description": "Total taxes amount (Vat Ksa)."},
            "third_party_cost": {"type": "number", "description": "Third party cost, 0 if not available."},
            "media_plan_total_amount": {"type": "number", "description": "Total media plan amount including agency fees."},
            "market_type": {"type": "string", "enum": ["A/E", "APAC", "DOMESTIC", "COE", "MEA"], "description": "Classified market type (BU/Markets from Geo-targeting)."},
            "period_month": {"type": "string", "description": "The billing period/month, usually at the top of the Excel."}
        },
        "required": [
            "medium", "net_media_cost", "agency_fees", "taxes_amount",
            "third_party_cost", "media_plan_total_amount", "market_type", "period_month"
        ]
    }

    prompt = f"""
You are an extremely precise financial analyst extracting data from an Excel-based Media Plan.
The original file name is '{original_file_name}'.

The content of the Excel sheet is provided below. Each row is separated by a newline, and columns by a tab.

{excel_text}

**CRITICAL INSTRUCTIONS FOR EXTRACTION:**
- **ALL NUMERICAL VALUES MUST BE EXTRACTED EXACTLY AS THEY APPEAR OR AS THEIR PRECISE SUM.** Do not round or approximate any numbers.
- If a field is not explicitly found, leave it out of the JSON response if it's not marked as required in the schema.

Extract the following details:
- **Medium:** Identify the type(s) of media by matching the following exact English names from the "Total Budget by Platform" section of the Excel sheet:
    - "Television"
    - "Radio"
    - "Print"
    - "Out of home – Indoor – In malls"
    - "Inflight"
    - "Cinema"
    - "Digital non biddable"
    - "Digital-Social/biddable Platforms"
    - "Digital-programmatic"
  Only include a type if it has an associated budget or cost greater than zero. If multiple types are present, combine them with commas (e.g., "Digital non biddable, Television, Print"). Use these exact English names as your output values.
- **Net Media Cost:** Locate the 'Net Media Cost' column and sum all numerical values found under it.
- **Agency Fees:** Locate the 'Agency Fee' column and sum all numerical values found under it.
- **Taxes Amount:** Find the total taxes amount, specifically looking for labels like 'Vat Ksa' or 'KSA VAT'. Extract the exact numerical value.
- **Third Party Cost:** Look for 'Other 3rd Party Fee/Cost' or similar. If a value is available, use it exactly. If not found, output 0.
- **Media Plan Total Amount:** Find the 'Total Payable (including agency fees)' or similar grand total. Extract the exact numerical value.
- **Market Type (BU/Markets):** Classify the market based on the 'Geotargeting' column. It must be one of: 'A/E', 'APAC', 'DOMESTIC' (use 'DOMESTIC' if 'Saudi Arabia' or 'KSA' is explicitly mentioned in Geo-targeting), 'COE', or 'MEA'. Prioritize these exact classifications.
- **Period Month:** Extract the period month from the top section of the Excel sheet, typically a date range or month-year (e.g., "Sep 2024 - Apr 2025").

Provide the extracted information in a structured JSON format matching the schema. Adhere strictly to the data types defined in the schema.
"""

    try:
        details = gemini_api_function(prompt, media_plan_schema)
        return details
    except Exception as e:
        print(f"Error processing Media Plan {original_file_name} with Gemini API: {e}")
        return {"error": f"AI processing failed for {original_file_name}"}


def extract_invoices_text(invoices: List[Dict]) -> List[str]:
    """
    Extract text content from a list of invoice PDF files.

    Args:
        invoices (List[Dict]): List of dicts with at least a "file_path" key.

    Returns:
        List[str]: Extracted text from each invoice (empty string if extraction fails).
    """
    extracted_texts: List[str] = []

    if not invoices or not isinstance(invoices, list):
        logger.warning("Invalid input provided to extract_invoices_text. Returning empty list.")
        return extracted_texts

    for invoice in invoices:
        file_path = invoice.get("file_path")

        if not file_path or not isinstance(file_path, str):
            logger.warning(f"Skipping invoice with invalid file_path: {invoice}")
            extracted_texts.append("")  # preserve alignment
            continue

        try:
            # Use S3 to read the PDF file
            text = read_pdf_from_s3(file_path)
            extracted_texts.append(text)
            if not text:
                logger.warning(f"No text extracted from {file_path} (possibly scanned image).")
        except Exception as e:
            logger.exception(f"Error processing {file_path}")
            extracted_texts.append("")
    
    return extracted_texts
def read_excel_file(file_path: str) -> Optional[List[List[Any]]]:
    """
    Reads the first sheet of an Excel file and returns its content as a list of lists.
    Now uses S3 for file access.
    """
    return read_excel_from_s3(file_path)
