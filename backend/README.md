# Bashayer Documents Verification API

A FastAPI backend for managing clients, agencies, jobs, invoices, and document verification.

## Features

- User authentication with JWT tokens
- Role-based access control (admin/user)
- Client and agency management
- Job tracking
- Invoice submission and verification
- Document checklist management
- File uploads and downloads

## Tech Stack

- **FastAPI**: Modern, fast web framework for building APIs
- **MongoDB**: NoSQL database for flexible document storage
- **Motor**: Asynchronous MongoDB driver for Python
- **Pydantic**: Data validation and settings management
- **JWT**: Token-based authentication

## Setup and Installation

### Prerequisites

- Python 3.8+
- MongoDB

### Installation

1. Clone the repository:
   ```
   git clone <repository-url>
   cd bashayer_documents_verification_dashboard_project/backend
   ```

2. Create a virtual environment:
   ```
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. Install dependencies:
   ```
   pip install -r requirements.txt
   ```

4. Create a `.env` file with the following variables:
   ```
   MONGODB_URI=mongodb://localhost:27017
   DATABASE_NAME=bashayer_db
   JWT_SECRET=your_super_secret_key_change_in_production
JWT_ALGORITHM=HS256
   JWT_EXPIRATION_MINUTES=60
   ```

### Running the API

1. Start the server:
   ```
   uvicorn main:app --reload
   ```

2. Generate sample data (optional):
   ```
   python sample_data.py
   ```

3. Access the API documentation at:
   ```
   http://localhost:8000/docs
   ```

## API Endpoints

### Authentication

- `POST /api/auth/signup`: Register a new user
- `POST /api/auth/login`: Login and get access token

### Users

- `POST /api/users`: Create a new user
- `GET /api/users`: Get all users
- `GET /api/users/me`: Get current user information

### Clients

- `POST /api/clients`: Create a new client
- `GET /api/clients`: Get all clients
- `GET /api/clients/{client_code}`: Get a specific client

### Rate Cards

- `POST /api/clients/{client_id}/ratecards`: Create a rate card for a client
- `GET /api/clients/{client_id}/ratecards`: Get all rate cards for a client
- `GET /api/ratecards/{id}`: Get a specific rate card
- `PUT /api/ratecards/{id}`: Update a rate card
- `DELETE /api/ratecards/{id}`: Delete a rate card

### Agencies

- `POST /api/agencies`: Create a new agency
- `GET /api/agencies`: Get all agencies
- `GET /api/agencies/{agency_code}`: Get a specific agency

### Jobs

- `POST /api/agencies/{agency_code}/jobs`: Create a new job for an agency
- `GET /api/agencies/{agency_code}/jobs`: Get all jobs for an agency
- `GET /api/jobs/{job_id}`: Get a specific job
- `PUT /api/jobs/{job_id}`: Update a job
- `DELETE /api/jobs/{job_id}`: Delete a job

### Invoices

- `POST /api/agencies/{agency_code}/jobs/{job_id}/invoices`: Create an invoice for a job
- `GET /api/agencies/{agency_code}/invoices`: Get all invoices for an agency
- `GET /api/invoices`: Get all invoices (with optional filtering)
- `GET /api/invoices/{invoice_id}`: Get a specific invoice
- `PUT /api/invoices/{invoice_id}`: Update an invoice
- `DELETE /api/invoices/{invoice_id}`: Delete an invoice
- `GET /api/invoices/{invoice_id}/download`: Download all files in an invoice as ZIP

### Folders

- `POST /api/invoices/{invoice_id}/folders`: Create a folder for an invoice
- `GET /api/invoices/{invoice_id}/folders`: Get all folders for an invoice
- `POST /api/invoices/{invoice_id}/generate_checklist`: Generate default checklist folders
- `POST /api/folders/{folder_id}/verify`: Mark a folder as verified
- `GET /api/folders/{folder_id}/download`: Download all files in a folder as ZIP

### Files

- `POST /api/folders/{folder_id}/files`: Upload a file to a folder
- `GET /api/folders/{folder_id}/files`: Get all files in a folder
- `DELETE /api/files/{file_id}`: Delete a file

## Data Models

### User

```python
{
    "id": "string",
    "username": "string",
    "email": "user@example.com",
    "role": "admin" | "user"
}
```

### Client

```python
{
    "id": "string",
    "name": "string",
    "client_code": "string",
    "rate_card_file": "string" | null,
    "created_by": "string",
    "created_at": "datetime"
}
```

### Agency

```python
{
    "id": "string",
    "name": "string",
    "client_id": "string",  # client_code
    "agency_code": "string",
    "rate_card_file": "string" | null,
    "created_by": "string",
    "created_at": "datetime"
}
```

### Job

```python
{
    "id": "string",
    "agency_id": "string",  # agency_code
    "title": "string",
    "description": "string" | null,
    "start_date": "datetime" | null,
    "end_date": "datetime" | null,
    "status": "pending" | "in_progress" | "completed",
    "created_by": "string",
    "created_at": "datetime",
    "updated_at": "datetime"
}
```

### Invoice

```python
{
    "id": "string",
    "agency_id": "string",  # agency_code
    "client_id": "string",  # client_code
    "job_id": "string",
    "status": "pending" | "in_review" | "approved" | "rejected" | "queried",
    "checklist": {
        "agency_invoice": [],
        "approved_quotation": [],
        "job_order": [],
        "timesheet": [],
        "third_party": [],
        "performance_proof": []
    },
    "notes": "string" | null,
    "created_by": "string",
    "created_at": "datetime",
    "updated_at": "datetime"
}
```

### Folder

```python
{
    "id": "string",
    "name": "string",
    "type": "agency_invoice" | "approved_quotation" | "job_order" | "timesheet" | "third_party" | "performance_proof" | "custom",
    "invoice_id": "string",
    "created_by": "string",
    "created_at": "datetime",
    "is_verified": true | false,
    "verified_by": "string" | null,
    "verified_at": "datetime" | null
}
```

### File

```python
{
    "id": "string",
    "folder_id": "string",
    "file_path": "string",
    "original_filename": "string",
    "file_size": 0,
    "mime_type": "string" | null,
    "metadata": {} | null,
    "uploaded_by": "string",
    "uploaded_at": "datetime"
}
```

## License

This project is licensed under the MIT License - see the LICENSE file for details.