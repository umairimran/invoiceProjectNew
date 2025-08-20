import os
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

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
rate_cards_collection = database.rate_cards
jobs_collection = database.jobs
invoices_collection = database.invoices
folders_collection = database.folders
files_collection = database.files

async def init_db():
    """Initialize database with indexes"""
    # Drop problematic indexes if they exist
    try:
        await clients_collection.drop_index("client_id_1")
        print("Dropped problematic index 'client_id_1' from clients collection")
    except Exception as e:
        # Index might not exist, that's okay
        print(f"Note: {str(e)}")
        
    try:
        await agencies_collection.drop_index("agency_id_1")
        print("Dropped problematic index 'agency_id_1' from agencies collection")
    except Exception as e:
        # Index might not exist, that's okay
        pass
        
    # Create unique indexes
    await users_collection.create_index("email", unique=True)
    await clients_collection.create_index("client_code", unique=True)
    await agencies_collection.create_index("agency_code", unique=True)
    
    # Create search indexes
    await invoices_collection.create_index([("agency_id", 1), ("client_id", 1)])
    await invoices_collection.create_index([("job_id", 1)])
    await jobs_collection.create_index([("agency_id", 1)])
    await rate_cards_collection.create_index([("client_id", 1)])
    await folders_collection.create_index([("invoice_id", 1)])
    await files_collection.create_index([("folder_id", 1)])
    
    print("Database indexes initialized successfully")