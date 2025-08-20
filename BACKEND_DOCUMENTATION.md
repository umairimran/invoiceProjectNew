# Bashayer Documents Verification Dashboard - Backend Documentation

## Table of Contents
1. [Architecture Overview](#architecture-overview)
2. [Database Schema](#database-schema)
3. [Authentication System](#authentication-system)
4. [API Endpoints](#api-endpoints)
   - [Authentication Endpoints](#authentication-endpoints)
   - [User Endpoints](#user-endpoints)
   - [Client Endpoints](#client-endpoints)
   - [Agency Endpoints](#agency-endpoints)
   - [Invoice Endpoints](#invoice-endpoints)
   - [File Upload Endpoints](#file-upload-endpoints)
5. [Code Structure](#code-structure)

## Architecture Overview

### Main Components
- **FastAPI Framework**: RESTful API implementation
- **MongoDB**: NoSQL database for data storage
- **Motor**: Async MongoDB driver
- **JWT**: Token-based authentication
- **Pydantic**: Data validation and serialization

### File Structure
```
backend/
│
├── main.py             # Application entry point and server configuration
├── db.py               # Database connection and collection setup
├── models.py           # Pydantic models for data validation
├── routes.py           # API route handlers
├── auth.py             # Authentication logic
├── .env                # Environment variables (create manually)
└── requirements.txt    # Python dependencies
```

## Database Schema

### Collections

#### users
```json
{
  "_id": ObjectId("..."),
  "username": "string",
  "email": "string",
  "hashed_password": "string",
  "role": "admin" | "user",
  "created_at": ISODate("...")
}
```
- **Indexes**: `email` (unique)

#### clients
```json
{
  "_id": ObjectId("..."),
  "client_id": "string",
  "name": "string",
  "rate_card_file": "string" | null,
  "created_by": "string",
  "created_at": ISODate("...")
}
```
- **Indexes**: `client_id` (unique)

#### agencies
```json
{
  "_id": ObjectId("..."),
  "agency_id": "string",
  "name": "string",
  "client_id": "string",
  "created_by": "string",
  "created_at": ISODate("...")
}
```
- **Indexes**: `agency_id` (unique)

#### invoices
```json
{
  "_id": ObjectId("..."),
  "agency_id": "string",
  "client_id": "string",
  "agency_invoice": {
    "image_path": "string" | null,
    "metadata": {
      "invoice_number": "string",
      "amount": number,
      "date": "string"
    } | null
  } | null,
  "media_plan": {
    "planned_file": "string" | null,
    "actualized_file": "string" | null
  } | null,
  "job_order": {
    "image_path": "string" | null,
    "metadata": {
      "order_number": "string",
      "date": "string"
    } | null
  } | null,
  "booking_order": {
    "image_path": "string" | null,
    "metadata": {
      "order_number": "string",
      "platform": "string"
    } | null
  } | null,
  "vendor_invoice": {
    "image_path": "string" | null,
    "metadata": {
      "vendor_name": "string",
      "phone": "string"
    } | null
  } | null,
  "appearance_proofs": ["string"] | [],
  "other_documents": ["string"] | [],
  "created_by": "string",
  "created_at": ISODate("...")
}
```
- **Indexes**: Compound index on `[("agency_id", 1), ("client_id", 1)]`

## Authentication System

### JWT Implementation
- **Secret Key**: Configured in `.env` file as `JWT_SECRET`
- **Algorithm**: HS256 (configured in `.env` as `JWT_ALGORITHM`)
- **Expiration**: 60 minutes by default (configurable in `.env` as `JWT_EXPIRATION_MINUTES`)

### Password Hashing
- **Library**: `passlib` with `bcrypt` backend
- **Function**: `get_password_hash()` in `auth.py`
- **Verification**: `verify_password()` in `auth.py`

### Token Generation
```python
def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    # Creates a JWT token with payload data and expiration time
```

### Authentication Flow
1. Client submits username/password to `/api/token` endpoint
2. Server verifies credentials, creates JWT token
3. Client uses token in Authorization header for subsequent requests
4. Server validates token via `get_current_user()` dependency

### Role-Based Access Control
- Two roles: `admin` and `user`
- Admin-only operations protected by `get_current_admin()` dependency
- Regular user operations protected by `get_current_user()` dependency

## API Endpoints

### Authentication Endpoints

#### `POST /api/token`
- **Purpose**: Login and obtain JWT token
- **Authentication**: None
- **Request Format**:
  ```
  Content-Type: application/x-www-form-urlencoded
  
  username=user@example.com&password=userpassword
  ```
- **Response Format**:
  ```json
  {
    "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6...",
    "token_type": "bearer"
  }
  ```
- **Status Codes**:
  - 200: Success
  - 401: Invalid credentials

### User Endpoints

#### `POST /api/users`
- **Purpose**: Create a new user
- **Authentication**: Admin only
- **Request Format**:
  ```json
  {
    "username": "john",
    "email": "john@example.com",
    "password": "securepassword",
    "role": "user"
  }
  ```
- **Response Format**:
  ```json
  {
    "id": "60d21b4967d0d8992e610c85",
    "username": "john",
    "email": "john@example.com",
    "role": "user"
  }
  ```
- **Status Codes**:
  - 200: Success
  - 400: Email already registered
  - 401: Unauthorized
  - 403: Not admin

#### `GET /api/users/me`
- **Purpose**: Get current user info
- **Authentication**: Any authenticated user
- **Request Format**: No body (JWT token in header)
- **Response Format**:
  ```json
  {
    "id": "60d21b4967d0d8992e610c85",
    "username": "john",
    "email": "john@example.com",
    "role": "user"
  }
  ```
- **Status Codes**:
  - 200: Success
  - 401: Unauthorized

#### `GET /api/users`
- **Purpose**: List all users
- **Authentication**: Admin only
- **Request Format**: No body (JWT token in header)
- **Response Format**:
  ```json
  [
    {
      "id": "60d21b4967d0d8992e610c85",
      "username": "admin",
      "email": "admin@example.com",
      "role": "admin"
    },
    {
      "id": "60d21b4967d0d8992e610c86",
      "username": "john",
      "email": "john@example.com",
      "role": "user"
    }
  ]
  ```
- **Status Codes**:
  - 200: Success
  - 401: Unauthorized
  - 403: Not admin

### Client Endpoints

#### `POST /api/clients`
- **Purpose**: Create a new client
- **Authentication**: Admin only
- **Request Format**:
  ```json
  {
    "client_id": "CLT001",
    "name": "Unilever Pakistan",
    "rate_card_file": "ratecards/unilever_rate.xlsx"
  }
  ```
- **Response Format**:
  ```json
  {
    "id": "60d21b4967d0d8992e610c87",
    "client_id": "CLT001",
    "name": "Unilever Pakistan",
    "rate_card_file": "ratecards/unilever_rate.xlsx",
    "created_by": "60d21b4967d0d8992e610c85",
    "created_at": "2023-08-10T15:30:45.123Z"
  }
  ```
- **Status Codes**:
  - 200: Success
  - 400: Client ID already exists
  - 401: Unauthorized
  - 403: Not admin

#### `GET /api/clients`
- **Purpose**: List all clients
- **Authentication**: Any authenticated user
- **Request Format**: No body (JWT token in header)
- **Response Format**:
  ```json
  [
    {
      "id": "60d21b4967d0d8992e610c87",
      "client_id": "CLT001",
      "name": "Unilever Pakistan",
      "rate_card_file": "ratecards/unilever_rate.xlsx",
      "created_by": "60d21b4967d0d8992e610c85",
      "created_at": "2023-08-10T15:30:45.123Z"
    },
    {
      "id": "60d21b4967d0d8992e610c88",
      "client_id": "CLT002",
      "name": "Nestle",
      "rate_card_file": null,
      "created_by": "60d21b4967d0d8992e610c85",
      "created_at": "2023-08-10T16:15:22.456Z"
    }
  ]
  ```
- **Status Codes**:
  - 200: Success
  - 401: Unauthorized

#### `GET /api/clients/{client_id}`
- **Purpose**: Get a specific client
- **Authentication**: Any authenticated user
- **Path Parameter**: `client_id` - The unique client ID (e.g., "CLT001")
- **Request Format**: No body (JWT token in header)
- **Response Format**:
  ```json
  {
    "id": "60d21b4967d0d8992e610c87",
    "client_id": "CLT001",
    "name": "Unilever Pakistan",
    "rate_card_file": "ratecards/unilever_rate.xlsx",
    "created_by": "60d21b4967d0d8992e610c85",
    "created_at": "2023-08-10T15:30:45.123Z"
  }
  ```
- **Status Codes**:
  - 200: Success
  - 401: Unauthorized
  - 404: Client not found

### Agency Endpoints

#### `POST /api/agencies`
- **Purpose**: Create a new agency
- **Authentication**: Any authenticated user
- **Request Format**:
  ```json
  {
    "agency_id": "AG001",
    "name": "Mediacom",
    "client_id": "CLT001"
  }
  ```
- **Response Format**:
  ```json
  {
    "id": "60d21b4967d0d8992e610c89",
    "agency_id": "AG001",
    "name": "Mediacom",
    "client_id": "CLT001",
    "created_by": "60d21b4967d0d8992e610c85",
    "created_at": "2023-08-10T17:45:12.789Z"
  }
  ```
- **Status Codes**:
  - 200: Success
  - 400: Agency ID already exists or Client not found
  - 401: Unauthorized

#### `GET /api/agencies`
- **Purpose**: List all agencies
- **Authentication**: Any authenticated user
- **Query Parameters**:
  - `client_id` (optional): Filter agencies by client ID
- **Request Format**: No body (JWT token in header)
- **Response Format**:
  ```json
  [
    {
      "id": "60d21b4967d0d8992e610c89",
      "agency_id": "AG001",
      "name": "Mediacom",
      "client_id": "CLT001",
      "created_by": "60d21b4967d0d8992e610c85",
      "created_at": "2023-08-10T17:45:12.789Z"
    },
    {
      "id": "60d21b4967d0d8992e610c8a",
      "agency_id": "AG002",
      "name": "Mindshare",
      "client_id": "CLT002",
      "created_by": "60d21b4967d0d8992e610c85",
      "created_at": "2023-08-10T17:50:33.123Z"
    }
  ]
  ```
- **Status Codes**:
  - 200: Success
  - 401: Unauthorized

#### `GET /api/agencies/{agency_id}`
- **Purpose**: Get a specific agency
- **Authentication**: Any authenticated user
- **Path Parameter**: `agency_id` - The unique agency ID (e.g., "AG001")
- **Request Format**: No body (JWT token in header)
- **Response Format**:
  ```json
  {
    "id": "60d21b4967d0d8992e610c89",
    "agency_id": "AG001",
    "name": "Mediacom",
    "client_id": "CLT001",
    "created_by": "60d21b4967d0d8992e610c85",
    "created_at": "2023-08-10T17:45:12.789Z"
  }
  ```
- **Status Codes**:
  - 200: Success
  - 401: Unauthorized
  - 404: Agency not found

### Invoice Endpoints

#### `POST /api/invoices`
- **Purpose**: Create a new invoice
- **Authentication**: Any authenticated user
- **Request Format**:
  ```json
  {
    "agency_id": "AG001",
    "client_id": "CLT001",
    "agency_invoice": {
      "metadata": {
        "invoice_number": "INV001",
        "amount": 100000,
        "date": "2023-08-15"
      }
    },
    "media_plan": {},
    "job_order": {
      "metadata": {
        "order_number": "JO123",
        "date": "2023-08-10"
      }
    },
    "booking_order": {
      "metadata": {
        "order_number": "BO456",
        "platform": "Geo TV"
      }
    },
    "vendor_invoice": {
      "metadata": {
        "vendor_name": "ABC Media",
        "phone": "+92-300-1234567"
      }
    },
    "appearance_proofs": [],
    "other_documents": []
  }
  ```
- **Response Format**:
  ```json
  {
    "id": "60d21b4967d0d8992e610c8b",
    "agency_id": "AG001",
    "client_id": "CLT001",
    "agency_invoice": {
      "image_path": null,
      "metadata": {
        "invoice_number": "INV001",
        "amount": 100000,
        "date": "2023-08-15"
      }
    },
    "media_plan": {
      "planned_file": null,
      "actualized_file": null
    },
    "job_order": {
      "image_path": null,
      "metadata": {
        "order_number": "JO123",
        "date": "2023-08-10"
      }
    },
    "booking_order": {
      "image_path": null,
      "metadata": {
        "order_number": "BO456",
        "platform": "Geo TV"
      }
    },
    "vendor_invoice": {
      "image_path": null,
      "metadata": {
        "vendor_name": "ABC Media",
        "phone": "+92-300-1234567"
      }
    },
    "appearance_proofs": [],
    "other_documents": [],
    "created_by": "60d21b4967d0d8992e610c85",
    "created_at": "2023-08-15T09:30:45.123Z"
  }
  ```
- **Status Codes**:
  - 200: Success
  - 400: Agency or Client not found
  - 401: Unauthorized

#### `GET /api/invoices`
- **Purpose**: List all invoices
- **Authentication**: Any authenticated user
- **Query Parameters**:
  - `agency_id` (optional): Filter invoices by agency ID
  - `client_id` (optional): Filter invoices by client ID
- **Request Format**: No body (JWT token in header)
- **Response Format**:
  ```json
  [
    {
      "id": "60d21b4967d0d8992e610c8b",
      "agency_id": "AG001",
      "client_id": "CLT001",
      "agency_invoice": {
        "image_path": "uploads/agency_invoice/AG001_agency_invoice_invoice.jpg",
        "metadata": {
          "invoice_number": "INV001",
          "amount": 100000,
          "date": "2023-08-15"
        }
      },
      "media_plan": {
        "planned_file": "uploads/media_plan_planned/AG001_media_plan_planned_plan.xlsx",
        "actualized_file": "uploads/media_plan_actualized/AG001_media_plan_actualized_actual.xlsx"
      },
      "job_order": {
        "image_path": "uploads/job_order/AG001_job_order_order.pdf",
        "metadata": {
          "order_number": "JO123",
          "date": "2023-08-10"
        }
      },
      "booking_order": {
        "image_path": "uploads/booking_order/AG001_booking_order_booking.pdf",
        "metadata": {
          "order_number": "BO456",
          "platform": "Geo TV"
        }
      },
      "vendor_invoice": {
        "image_path": "uploads/vendor_invoice/AG001_vendor_invoice_vendor.pdf",
        "metadata": {
          "vendor_name": "ABC Media",
          "phone": "+92-300-1234567"
        }
      },
      "appearance_proofs": [
        "uploads/appearance_proof/AG001_appearance_proof_proof1.jpg",
        "uploads/appearance_proof/AG001_appearance_proof_proof2.jpg"
      ],
      "other_documents": [
        "uploads/other/AG001_other_doc1.pdf"
      ],
      "created_by": "60d21b4967d0d8992e610c85",
      "created_at": "2023-08-15T09:30:45.123Z"
    }
  ]
  ```
- **Status Codes**:
  - 200: Success
  - 401: Unauthorized

#### `GET /api/invoices/{invoice_id}`
- **Purpose**: Get a specific invoice
- **Authentication**: Any authenticated user
- **Path Parameter**: `invoice_id` - The MongoDB ObjectId
- **Request Format**: No body (JWT token in header)
- **Response Format**:
  ```json
  {
    "id": "60d21b4967d0d8992e610c8b",
    "agency_id": "AG001",
    "client_id": "CLT001",
    "agency_invoice": {
      "image_path": "uploads/agency_invoice/AG001_agency_invoice_invoice.jpg",
      "metadata": {
        "invoice_number": "INV001",
        "amount": 100000,
        "date": "2023-08-15"
      }
    },
    "media_plan": {
      "planned_file": "uploads/media_plan_planned/AG001_media_plan_planned_plan.xlsx",
      "actualized_file": "uploads/media_plan_actualized/AG001_media_plan_actualized_actual.xlsx"
    },
    "job_order": {
      "image_path": "uploads/job_order/AG001_job_order_order.pdf",
      "metadata": {
        "order_number": "JO123",
        "date": "2023-08-10"
      }
    },
    "booking_order": {
      "image_path": "uploads/booking_order/AG001_booking_order_booking.pdf",
      "metadata": {
        "order_number": "BO456",
        "platform": "Geo TV"
      }
    },
    "vendor_invoice": {
      "image_path": "uploads/vendor_invoice/AG001_vendor_invoice_vendor.pdf",
      "metadata": {
        "vendor_name": "ABC Media",
        "phone": "+92-300-1234567"
      }
    },
    "appearance_proofs": [
      "uploads/appearance_proof/AG001_appearance_proof_proof1.jpg",
      "uploads/appearance_proof/AG001_appearance_proof_proof2.jpg"
    ],
    "other_documents": [
      "uploads/other/AG001_other_doc1.pdf"
    ],
    "created_by": "60d21b4967d0d8992e610c85",
    "created_at": "2023-08-15T09:30:45.123Z"
  }
  ```
- **Status Codes**:
  - 200: Success
  - 400: Invalid invoice ID format
  - 401: Unauthorized
  - 404: Invoice not found

### File Upload Endpoints

#### `POST /api/upload/{document_type}/{entity_id}`
- **Purpose**: Upload a file for a specific document type and entity
- **Authentication**: Any authenticated user
- **Path Parameters**:
  - `document_type`: Type of document (one of: `agency_invoice`, `media_plan_planned`, `media_plan_actualized`, `job_order`, `booking_order`, `vendor_invoice`, `appearance_proof`, `other`)
  - `entity_id`: The entity ID (typically agency_id)
- **Request Format**:
  ```
  Content-Type: multipart/form-data
  
  file=@/path/to/file.pdf
  ```
- **Response Format**:
  ```json
  {
    "filename": "AG001_agency_invoice_invoice.pdf",
    "file_path": "uploads/agency_invoice/AG001_agency_invoice_invoice.pdf"
  }
  ```
- **Status Codes**:
  - 200: Success
  - 400: Invalid document type
  - 401: Unauthorized

## Code Structure

### main.py
- **Purpose**: Application entry point
- **Key Functions**:
  - `startup_db_client()`: Initializes database on application startup
  - `shutdown_db_client()`: Closes database connection on shutdown

```python
# Create FastAPI app
app = FastAPI(title="Bashayer Documents Verification API")

# Configure CORS
app.add_middleware(CORSMiddleware, allow_origins=["*"], ...)

# Include API routes
app.include_router(router, prefix="/api")

# Create upload directories & serve static files
uploads_dir = Path("uploads")
uploads_dir.mkdir(exist_ok=True)
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

@app.on_event("startup")
async def startup_db_client():
    await init_db()
    # Create default admin if none exists
    if await users_collection.count_documents({}) == 0:
        default_admin = {
            "username": "admin",
            "email": "admin@example.com",
            "hashed_password": get_password_hash("adminpassword"),
            "role": Role.ADMIN
        }
        await users_collection.insert_one(default_admin)
```

### db.py
- **Purpose**: Database connection and collection setup
- **Key Components**:
  - MongoDB connection setup
  - Collection definitions
  - Database initialization with indexes

```python
# Get MongoDB connection settings
MONGODB_URI = os.getenv("MONGODB_URI", "mongodb://localhost:27017")
DATABASE_NAME = os.getenv("DATABASE_NAME", "bashayer_db")

# Database client
client = AsyncIOMotorClient(MONGODB_URI)
database = client[DATABASE_NAME]

# Collections
users_collection = database.users
clients_collection = database.clients
agencies_collection = database.agencies
invoices_collection = database.invoices

async def init_db():
    """Initialize database with indexes"""
    await users_collection.create_index("email", unique=True)
    await clients_collection.create_index("client_id", unique=True)
    await agencies_collection.create_index("agency_id", unique=True)
    await invoices_collection.create_index([("agency_id", 1), ("client_id", 1)])
```

### models.py
- **Purpose**: Pydantic models for data validation
- **Key Components**:
  - Base models for core entities
  - Create models (for input validation)
  - Database models (for storage)
  - Response models (for API output)

```python
# User models
class Role(str, Enum):
    ADMIN = "admin"
    USER = "user"

class UserBase(BaseModel):
    username: str
    email: str
    role: Role = Role.USER

class UserCreate(UserBase):
    password: str

class UserInDB(UserBase):
    id: Optional[str] = None
    hashed_password: str
    created_at: datetime = Field(default_factory=datetime.utcnow)

class User(UserBase):
    id: str

# Token model
class Token(BaseModel):
    access_token: str
    token_type: str

# Similar patterns for Client, Agency, Invoice models...
```

### auth.py
- **Purpose**: Authentication and authorization
- **Key Functions**:
  - Password hashing and verification
  - JWT token creation and validation
  - User authentication
  - Role-based access control

```python
# Password verification
def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

# Password hashing
def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)

# User retrieval
async def get_user_by_email(email: str) -> Optional[UserInDB]:
    if (user := await users_collection.find_one({"email": email})) is not None:
        user_dict = {**user, "id": str(user["_id"])}
        return UserInDB(**user_dict)
    return None

# User authentication
async def authenticate_user(email: str, password: str) -> Optional[UserInDB]:
    user = await get_user_by_email(email)
    if not user or not verify_password(password, user.hashed_password):
        return None
    return user

# JWT token creation
def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    # Creates JWT token with expiration

# Get current user from token
async def get_current_user(token: str = Depends(oauth2_scheme)) -> User:
    # Validates token and returns user

# Admin access check
async def get_current_admin(current_user: User = Depends(get_current_user)) -> User:
    # Checks if user is admin
```

### routes.py
- **Purpose**: API route handlers
- **Key Components**:
  - Route definitions for all endpoints
  - Request processing logic
  - Database operations
  - Response formatting

```python
# Authentication endpoint
@router.post("/token", response_model=Token)
async def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends()):
    # Authenticates user and returns token

# User endpoints
@router.post("/users", response_model=User)
async def create_user(user: UserCreate, current_user: User = Depends(get_current_admin)):
    # Creates a new user (admin only)

# Similar patterns for Client, Agency, Invoice endpoints

# File upload endpoint
@router.post("/upload/{document_type}/{entity_id}")
async def upload_file(document_type: str, entity_id: str, file: UploadFile = File(...)):
    # Validates and saves uploaded file
```

## Setup Instructions

1. **Install dependencies**
```bash
cd backend
pip install -r requirements.txt
```

2. **Create .env file**
Create a `.env` file in the backend directory with:
```
MONGODB_URI=mongodb://localhost:27017
DATABASE_NAME=bashayer_db
JWT_SECRET=your_super_secret_key_change_in_production
JWT_ALGORITHM=HS256
JWT_EXPIRATION_MINUTES=60
```

3. **Run the server**
```bash
python main.py
```

4. **Access API documentation**
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

5. **Default Admin User**
- Email: admin@example.com
- Password: adminpassword
- *Important:* Change this password after first login!