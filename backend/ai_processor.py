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

import pdfplumber
from dotenv import load_dotenv
from google import genai
from google.genai import types
import openpyxl
import pandas as pd

# Import these libraries when you're ready to implement the functions
# import pytesseract
# from PIL import Image
# import pdfplumber
# import cv2
# import numpy as np

# Constants
UPLOAD_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "uploads")

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
            
        folder_data = process_folder_documents(folder_type, documents, job["id"])
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
    
    for doc in documents:
        # Get the full path to the document
        file_path = os.path.join(UPLOAD_DIR, doc["file_path"])
        if not os.path.exists(file_path):
            print(f"File not found: {file_path}")
            continue
            
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


def validate_job_checklist(job: Dict[str, Any]) -> List[str]:
    """
    Validates the documents in the job's checklist against predefined rules.

    Args:
        job: The job document from MongoDB.

    Returns:
        A list of strings indicating missing or incorrect items.
    """
    missing_items = []
    checklist = job.get("checklist", {})

    # Rule 1: invoices - exactly three PDF files
    invoices = checklist.get("agency_invoice", [])
    pdf_invoices = [doc for doc in invoices if doc.get("file_path", "").lower().endswith(".pdf")]
    if len(pdf_invoices) != 3:
        missing_items.append("invoices (exactly 3 PDF files required)")

    # Rule 2: approved_quotation - exactly two Excel files
    approved_quotation = checklist.get("approved_quotation", [])
    excel_quotations = [doc for doc in approved_quotation if doc.get("file_path", "").lower().endswith((".xls", ".xlsx"))]
    if len(excel_quotations) != 2:
        missing_items.append("approved_quotation (exactly 2 Excel files required)")

    # Rule 3: job_order - exactly one PDF file
    job_order = checklist.get("job_order", [])
    pdf_job_orders = [doc for doc in job_order if doc.get("file_path", "").lower().endswith(".pdf")]
    if len(pdf_job_orders) != 1:
        missing_items.append("job_order (exactly 1 PDF file required)")

    # Rule 4: timesheet - always true for now
    if not checklist.get("timesheet", True):  # Assuming 'True' means valid/not missing for now
        # This condition will likely never be met with current assumption, but keeps the structure
        missing_items.append("timesheet (always considered valid for now)")
    
    # Rule 5: third_party - always true for now
    if not checklist.get("third_party", True):  # Assuming 'True' means valid/not missing for now
        # This condition will likely never be met with current assumption, but keeps the structure
        missing_items.append("third_party (always considered valid for now)")

    # Rule 6: performance_proof - any number of screenshots (JPG, JPEG, PNG)
    performance_proof = checklist.get("performance_proof", [])
    screenshot_proofs = [doc for doc in performance_proof if doc.get("file_path", "").lower().endswith((".jpg", ".jpeg", ".png"))]
    if not screenshot_proofs and len(performance_proof) > 0:
        # If there are files but none are screenshots, or if there are no files at all
        missing_items.append("performance_proof (at least one screenshot required if section exists)")
    elif len(performance_proof) == 0:
        pass # No performance proof documents are present, which is acceptable if not required.

    return missing_items
def gemini_api_function(prompt: str, schema: dict):
    import os
    from dotenv import load_dotenv
    from google import genai
    from google.genai import types

    # Load environment variables
    load_dotenv()

    # Initialize client with API key
    client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))

    # Choose model
    model = "gemini-2.0-flash"

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

def extract_agency_details_from_invoices(invoices_text_extracted: list, agency_invoices: list):
    """
    Extracts agency details from a list of invoice texts using a Gemini API.

    Args:
        invoices_text_extracted (list): A list of strings, where each string is the extracted text from a PDF invoice.
        agency_invoices (list): A list of dictionaries, where each dictionary represents an invoice
                                and contains a "file_path" key indicating the path to the PDF file.

    Returns:
        A dictionary containing the extracted details and a summary.
        Returns a fallback message if less than three invoices are provided.
    """
    if len(invoices_text_extracted) < 3:
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
            "percentage": {"type": "string", "description": "Must be one of: 20%, 30%, 50%", "enum": ["20%", "30%", "50%"]}
        },
        "required": ["agency_invoice_number", "project_code", "campaign_name", "total_amount", "percentage"]
    }

    extracted_details_list = []
    total_amount = 0
    invoice_details = []
    file_names = []

    for i, text in enumerate(invoices_text_extracted):
        invoice_doc = agency_invoices[i]
        original_file_name = invoice_doc.get("original_filename", invoice_doc.get("file_path", "unknown file"))
        file_names.append(original_file_name)
        
        prompt = f"""
        Extract the following details from the invoice text below. The original invoice file name is '{original_file_name}'.

        The 'invoice percentage' value is very important and MUST be one of the following values: 20%, 30%, or 50%.

        To find the percentage, follow these steps in order:
        1. **First, check the file name:** Look for '20%', '30%', or '50%' in the file name '{original_file_name}'. If you find it, use that value and stop searching.
        2. **If not in the file name, then check the invoice text:** Search the text body of the invoice for '20%', '30%', or '50%'.

        Please return the first value you find based on this priority. If you cannot find one of these three values in either the filename or the text, do not return a percentage.

        Invoice text:
        ---
        {text}
        ---
        """
        try:
            details = gemini_api_function(prompt, invoice_schema)
            details["file_name"] = original_file_name
            extracted_details_list.append(details)
            total_amount += details.get("total_amount", 0)
            if "agency_invoice_number" in details and "percentage" in details:
                invoice_details.append(f"{details['agency_invoice_number']} - {details['percentage']}")
        except Exception as e:
            print(f"Error processing invoice {original_file_name} with Gemini API: {e}")
            # Optionally, handle the error, e.g., by appending an error entry
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
    """
    Extracts PO details from a job order PDF.

    Args:
        job_order_docs (list): A list of job order documents. Should contain one PDF.

    Returns:
        A dictionary containing the extracted PO number and PO amount.
    """
    if not job_order_docs:
        return {}

    # Assuming the first document is the correct one
    job_order_doc = job_order_docs[0]
    file_path = job_order_doc.get("file_path")
    original_file_name = job_order_doc.get("original_filename", file_path)

    if not file_path:
        return {}

    # Extract text from the PDF
    try:
        with pdfplumber.open(file_path) as pdf:
            text = ""
            for page in pdf.pages:
                text += page.extract_text()
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
    Extracts media plan details from the approved quotation Excel file.

    Args:
        approved_quotation_docs (list): A list of approved quotation documents.

    Returns:
        A dictionary containing the extracted media plan details.
    """
    media_plan_doc = None
    for doc in approved_quotation_docs:
        original_filename = doc.get("original_filename", "").lower()
        if "media plan" in original_filename and original_filename.endswith(('.xlsx', '.xls')):
            media_plan_doc = doc
            break

    if not media_plan_doc:
        print("Media plan Excel file not found in approved_quotation.")
        return {}

    file_path = media_plan_doc.get("file_path")
    original_file_name = media_plan_doc.get("original_filename", file_path)

    excel_data = read_excel_file(file_path)
    if not excel_data:
        return {"error": f"Failed to read Excel file {original_file_name}"}

    # Convert excel_data to a string format suitable for the prompt
    excel_text = ""
    for row in excel_data:
        excel_text += "\t".join([str(cell) if cell is not None else "" for cell in row]) + "\n"

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
    - **Medium:** Identify the type(s) of media. Look for entries with associated budget/cost. If multiple types are present, combine them with commas (e.g., 'Digital, TV, Print').
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


def extract_invoices_text(invoices: list) -> list:
        """
        Extract text content from a list of invoice PDF files.
        """
        extracted_texts = []
        if not invoices or not isinstance(invoices, list):
            return extracted_texts

        for invoice in invoices:
            file_path = invoice.get("file_path")
            if not file_path or not isinstance(file_path, str):
                continue  # Skip if file_path is missing or not a string

            try:
                with pdfplumber.open(file_path) as pdf:
                    text = ""
                    for page in pdf.pages:
                        text += page.extract_text()
                    extracted_texts.append(text)
            except Exception as e:
                print(f"Error processing {file_path}: {e}")
                continue  # Skip if there's an error processing the file

        return extracted_texts

def read_excel_file(file_path: str) -> Optional[List[List[Any]]]:
    """
    Reads the first sheet of an Excel file and returns its content as a list of lists.
    """
    try:
        df = pd.read_excel(file_path, sheet_name=0, header=None)
        return df.values.tolist()
    except Exception as e:
        print(f"Error reading Excel file {file_path}: {e}")
        return None
