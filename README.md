# Bashayer Documents Verification Dashboard

A comprehensive document management and verification system for Bashayer (Saudi Arabia, Riyadh), designed to handle client-agency relationships and document workflows with a specialized folder-based document management system.

## 🏗️ Architecture

- **Backend**: FastAPI with MongoDB (async Motor driver)
- **Frontend**: Next.js React application with modern UI components
- **Database**: MongoDB with document-based storage and file organization
- **File Storage**: Local filesystem with organized folder structure

## ✨ Key Features

### Core System
- **User authentication** with JWT tokens
- **Client management** with unique client codes
- **Agency management** linked to clients
- **File upload** with validation (PDF, Excel)
- **Document verification** workflows

### 📁 Agency Document Folder System (NEW)
- **6 predefined document folders** per agency:
  1. Agency Invoice
  2. Approved Quotation  
  3. Job Order (JO)
  4. Timesheet
  5. Third Party
  6. Proof of Screenshot
- **Visual status indicators** (✅ received, ⬜ empty)
- **Multi-file support** per folder
- **File validation** (PDF, Excel only, 10MB limit)
- **Real-time folder status** updates

## 🚀 Quick Start

### 1. Backend Setup
```bash
# Navigate to backend
cd backend

# Create virtual environment
python3 -m venv ../venv
source ../venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Create .env file
cat > .env << 'EOF'
MONGODB_URI=mongodb://root:example@localhost:27017/?authSource=admin
DATABASE_NAME=appdb
JWT_SECRET=change_me_dev_secret_please_rotate
JWT_ALGORITHM=HS256
JWT_EXPIRATION_MINUTES=120
EOF

# Start MongoDB (if using local)
# OR start with Docker: docker compose up -d

# Run the API server
python -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

### 2. Frontend Setup
```bash
# Navigate to frontend2 (recommended version)
cd frontend2

# Install dependencies (if not already installed)
npm install

# Start development server
npm run dev
```

### 3. Access the Application
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000
- **API Documentation**: http://localhost:8000/docs

## 📊 System Flow

```
Client → Agency → Document Folders → Files
```

1. **Create Client** with unique `client_code`
2. **Create Agency** under client with `agency_code`
3. **Access Agency Page** to see 6 document folders
4. **Upload files** to appropriate folders (PDF/Excel)
5. **View status** with visual indicators

## 🗂️ Document Folder Structure

```
uploads/
├── agency_invoice/
│   ├── AGY-123_agency_invoice_timestamp_file1.pdf
│   └── AGY-123_agency_invoice_timestamp_file2.xlsx
├── approved_quotation/
├── job_order/
├── timesheet/
├── third_party/
└── proof_screenshot/
```

## 🔧 Configuration

### Backend Environment Variables
```bash
MONGODB_URI=mongodb://localhost:27017          # MongoDB connection
DATABASE_NAME=appdb                            # Database name
JWT_SECRET=your_secret_key                     # JWT signing key
JWT_ALGORITHM=HS256                            # JWT algorithm
JWT_EXPIRATION_MINUTES=120                     # Token expiration
```

### Frontend Configuration
The Next.js app automatically proxies API calls to the backend via `next.config.js`:
- `/api/*` → `http://localhost:8000/api/*`
- `/uploads/*` → `http://localhost:8000/uploads/*`

## 📱 API Endpoints

### Core Endpoints
- `GET /api/health` — Health check
- `POST /api/auth/login` — User authentication
- `GET /api/clients` — List all clients
- `GET /api/agencies` — List all agencies
- `POST /api/upload/{type}/{agency_code}` — File upload

### Folder System Endpoints (NEW)
- `GET /api/agencies/{agency_code}/folders/status` — Get folder status
- `GET /api/files/check/{document_type}/{agency_code}` — Check folder files
- `GET /api/files/{filename}?download=true` — Download file

## 🧪 Testing the System

1. **Create a test client**:
```bash
curl -X POST "http://localhost:8000/api/clients" \
  -H "Content-Type: application/json" \
  -d '{"name": "Test Client Company"}'
```

2. **Create a test agency**:
```bash
curl -X POST "http://localhost:8000/api/agencies" \
  -H "Content-Type: application/json" \
  -d '{"name": "Test Agency", "client_id": "CLT-XXXXXX"}'
```

3. **Check folder status**:
```bash
curl "http://localhost:8000/api/agencies/AGY-XXXXXX/folders/status"
```

4. **Upload a test file**:
```bash
curl -X POST -F "file=@test.pdf" \
  "http://localhost:8000/api/upload/agency_invoice/AGY-XXXXXX"
```

## 🛠️ Development

### Backend Structure
```
backend/
├── main.py              # FastAPI app with startup/shutdown
├── db.py               # MongoDB connection and initialization
├── models.py           # Pydantic data models
├── routes.py           # Core API routes + folder system
├── file_routes.py      # File download/check routes
├── auth.py             # JWT authentication
└── uploads/            # File storage directory
```

### Frontend Structure
```
frontend2/
├── app/
│   ├── agencies/[agencyCode]/page.jsx    # Agency detail page
│   ├── clients/[clientCode]/page.jsx     # Client detail page
│   └── ...
├── components/
│   ├── agencies/AgencyFolders.jsx        # Folder system component
│   ├── ui/LoadingSpinner.jsx            # UI components
│   └── ...
└── services/api.js                       # API service layer
```

## 🔍 Troubleshooting

### Backend Issues
- **MongoDB connection**: Ensure MongoDB is running and credentials are correct
- **File upload errors**: Check file types (PDF/Excel only) and size (10MB limit)
- **Permission errors**: Ensure `uploads/` directory is writable

### Frontend Issues
- **API proxy errors**: Verify backend is running on port 8000
- **Component errors**: Check browser console for React errors

## 📋 Project Status

✅ **Completed Features**:
- Backend API with folder system
- Agency folder component with status indicators
- File upload with validation (PDF/Excel)
- Real-time folder status updates
- Agency page integration

🔄 **Remaining Tasks**:
- File management UI (preview, delete)
- Enhanced error handling
- User role-based access control
- Production deployment configuration

## 📝 Notes

- Default admin user created on first run: `admin@example.com` / `adminpassword`
- Files are automatically timestamped to prevent naming conflicts
- MongoDB indexes are created automatically on startup
- The system is configured for development; update security settings for production

For detailed backend setup instructions, see `backend/README.md`.