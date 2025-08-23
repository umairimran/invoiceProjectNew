from pydantic import BaseModel, Field, EmailStr
from typing import Optional, List, Dict, Union
from datetime import datetime
from enum import Enum


# ==============================
# User & Authentication Models
# ==============================
class Role(str, Enum):
    ADMIN = "admin"
    USER = "user"


class UserBase(BaseModel):
    username: str
    email: EmailStr
    role: Role = Role.USER


class UserCreate(UserBase):
    password: str


class UserInDB(UserBase):
    id: Optional[str] = None
    hashed_password: str
    created_at: datetime = Field(default_factory=datetime.utcnow)


class User(UserBase):
    id: str


class Token(BaseModel):
    access_token: str
    token_type: str


# ==============================
# Client & Rate Card Models
# ==============================
class ClientBase(BaseModel):
    name: str
    rate_card_file: Optional[str] = None  # link to template file


class ClientCreate(ClientBase):
    pass


class ClientInDB(ClientBase):
    id: Optional[str] = None
    client_code: str
    created_by: str
    created_at: datetime = Field(default_factory=datetime.utcnow)


class Client(ClientBase):
    id: str
    client_code: str
    created_by: str
    created_at: datetime


class RateCardBase(BaseModel):
    file_url: str
    description: Optional[str] = None
    valid_from: Optional[datetime] = None
    valid_to: Optional[datetime] = None


class RateCardCreate(RateCardBase):
    client_id: str


class RateCardInDB(RateCardBase):
    id: Optional[str] = None
    client_id: str
    uploaded_by: str
    uploaded_at: datetime = Field(default_factory=datetime.utcnow)


class RateCard(RateCardBase):
    id: str
    client_id: str
    uploaded_by: str
    uploaded_at: datetime


# ==============================
# Agency Models
# ==============================
class AgencyBase(BaseModel):
    name: str
    client_id: str
    rate_card_file: Optional[str] = None


class AgencyCreate(AgencyBase):
    pass


class AgencyInDB(AgencyBase):
    id: Optional[str] = None
    agency_code: str
    created_by: str
    created_at: datetime = Field(default_factory=datetime.utcnow)
    custom_folders: List[Dict] = Field(default_factory=list)


class Agency(AgencyBase):
    id: str
    agency_code: str
    created_by: str
    created_at: datetime


# ==============================
# Job Models 
# ==============================
class JobStatus(str, Enum):
    NOT_COMPLIANT = "Not Compliant"  # Default status when job is created
    COMPLIANT = "Compliant"           # Status when all documents are verified


# Job Review/Finance structure
class JobReview(BaseModel):
    # Header / identifiers
    market_bu: Optional[str] = None
    agency_invoice_number: Optional[str] = None
    po_number: Optional[str] = None
    period_month: Optional[str] = None

    # Timeline (dates)
    date_invoice_sent_to_medpush: Optional[datetime] = None
    date_medpush_shared_feedback: Optional[datetime] = None
    date_agency_responded_to_feedback: Optional[datetime] = None
    date_medpush_approved_invoice: Optional[datetime] = None

    # Campaign / medium
    medium: Optional[str] = None
    campaign_name: Optional[str] = None

    # Financials
    net_media_cost: Optional[float] = None
    agency_fee: Optional[float] = None
    taxes: Optional[float] = None
    other_third_party_cost: Optional[float] = None
    agency_invoice_total_amount: Optional[float] = None
    media_plan_total_amount: Optional[float] = None
    po_amount_with_af: Optional[float] = None

    # Review text
    initial_review_outcome: Optional[str] = None
    agency_feedback_action: Optional[str] = None
    final_review_outcome: Optional[str] = None
    status_of_received_invoices: Optional[str] = None

    # Month tag
    month_medpush_received_invoice: Optional[str] = None

    # Durations (# of days)
    days_medpush_to_review_and_share_feedback: Optional[int] = None
    days_agency_to_revert_to_medpush: Optional[int] = None
    days_medpush_to_approve_after_revision: Optional[int] = None

    # Raw AI Output
    raw_ai_invoice_output: Optional[Dict] = None
    raw_ai_po_output: Optional[Dict] = None


# Document checklist for jobs
class JobChecklist(BaseModel):
    agency_invoice: List["Document"] = Field(default_factory=list)
    approved_quotation: List["Document"] = Field(default_factory=list)
    job_order: List["Document"] = Field(default_factory=list)
    timesheet: List["Document"] = Field(default_factory=list)
    third_party: List["Document"] = Field(default_factory=list)
    performance_proof: List["Document"] = Field(default_factory=list)


class JobBase(BaseModel):
    agency_id: str  # agency_code
    title: str
    description: Optional[str] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    status: JobStatus = JobStatus.NOT_COMPLIANT
    review: Optional[JobReview] = None
    checklist: JobChecklist = Field(default_factory=JobChecklist)


class JobCreate(JobBase):
    pass


class JobInDB(JobBase):
    id: Optional[str] = None
    created_by: Optional[str] = "Admin"
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class Job(JobBase):
    id: str
    created_by: str
    created_at: datetime
    updated_at: datetime


# ==============================
# Invoice & Checklist Models
# ==============================
class InvoiceStatus(str, Enum):
    PENDING = "pending"
    IN_REVIEW = "in_review"
    APPROVED = "approved"
    REJECTED = "rejected"
    QUERIED = "queried"


class Document(BaseModel):
    """Represents a single uploaded file"""
    file_path: str
    original_filename: Optional[str] = None
    metadata: Optional[Dict[str, str]] = None
    uploaded_at: datetime = Field(default_factory=datetime.utcnow)
    uploaded_by: Optional[str] = None


class InvoiceChecklist(BaseModel):
    agency_invoice: List[Document] = Field(default_factory=list)
    approved_quotation: List[Document] = Field(default_factory=list)
    job_order: List[Document] = Field(default_factory=list)
    timesheet: List[Document] = Field(default_factory=list)
    third_party: List[Document] = Field(default_factory=list)
    performance_proof: List[Document] = Field(default_factory=list)


class InvoiceBase(BaseModel):
    agency_id: str  # agency_code
    client_id: str  # client_code
    job_id: str     # job_id
    status: InvoiceStatus = InvoiceStatus.PENDING
    checklist: InvoiceChecklist = Field(default_factory=InvoiceChecklist)
    notes: Optional[str] = None


class InvoiceCreate(InvoiceBase):
    pass


class InvoiceInDB(InvoiceBase):
    id: Optional[str] = None
    created_by: str
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class Invoice(InvoiceBase):
    id: str
    created_by: str
    created_at: datetime
    updated_at: datetime


# ==============================
# Folder & File Models
# ==============================
class FolderType(str, Enum):
    AGENCY_INVOICE = "agency_invoice"
    APPROVED_QUOTATION = "approved_quotation"
    JOB_ORDER = "job_order"
    TIMESHEET = "timesheet"
    THIRD_PARTY = "third_party"
    PERFORMANCE_PROOF = "performance_proof"
    CUSTOM = "custom"


class FolderBase(BaseModel):
    name: str
    type: Union[FolderType, str]
    invoice_id: str


class FolderCreate(FolderBase):
    pass


class FolderInDB(FolderBase):
    id: Optional[str] = None
    created_by: str
    created_at: datetime = Field(default_factory=datetime.utcnow)
    is_verified: bool = False
    verified_by: Optional[str] = None
    verified_at: Optional[datetime] = None


class Folder(FolderBase):
    id: str
    created_by: str
    created_at: datetime
    is_verified: bool
    verified_by: Optional[str] = None
    verified_at: Optional[datetime] = None


class FileBase(BaseModel):
    folder_id: str
    file_path: str
    original_filename: str
    file_size: int
    mime_type: Optional[str] = None
    metadata: Optional[Dict[str, str]] = None


class FileCreate(FileBase):
    pass


class FileInDB(FileBase):
    id: Optional[str] = None
    uploaded_by: str
    uploaded_at: datetime = Field(default_factory=datetime.utcnow)


class File(FileBase):
    id: str
    uploaded_by: str
    uploaded_at: datetime