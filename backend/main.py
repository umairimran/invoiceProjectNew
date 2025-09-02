import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import uvicorn
from pathlib import Path
from auth import get_password_hash
from db import init_db, users_collection
from routes import router as legacy_router
from file_routes import router as file_router
from job_routes import router as job_router
from folder_routes import router as folder_router
from invoice_routes import router as invoice_router
from report_routes import router as report_router
from admin_routes import router as admin_router
from models import Role

# Create FastAPI app
app = FastAPI(title="Documents Verification API")
from dotenv import load_dotenv

# Load environment variables
load_dotenv()  # take environment variables from .env
origins = os.getenv("CORS_ORIGINS", "http://localhost:3000,https://invoicesproject-pajsiv6n2-umairimrans-projects-de44185d.vercel.app").split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Temporarily allow all origins for testing
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API routes
app.include_router(legacy_router, prefix="/api")
app.include_router(file_router, prefix="/api")
app.include_router(job_router, prefix="/api")
app.include_router(folder_router, prefix="/api")
app.include_router(invoice_router, prefix="/api")
app.include_router(report_router, prefix="/api")
app.include_router(admin_router, prefix="/api")

# Create upload directories
uploads_dir = Path("uploads")
uploads_dir.mkdir(exist_ok=True)

# Serve static files for uploads
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

@app.on_event("startup")
async def startup_db_client():
    """Initialize database on startup"""
    await init_db()
    
    # Create default admin if no users exist
    if await users_collection.count_documents({}) == 0:
        default_admin = {
            "username": "admin",
            "email": "admin@gmail.com",
            "hashed_password": get_password_hash("admin123"),
            "role": Role.ADMIN
        }
        await users_collection.insert_one(default_admin)
        print("Created default admin user: admin@example.com / adminpassword")

@app.on_event("shutdown")
async def shutdown_db_client():
    """Close database connection on shutdown"""
    pass

@app.get("/")
async def root():
    """Root endpoint"""
    return {"message": "Welcome to Bashayer Documents Verification API"}

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy"}

if __name__ == "__main__":
    # Use 0.0.0.0 instead of localhost to allow external connections
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)