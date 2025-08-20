import requests
import json
import os
import pymongo
from bson.objectid import ObjectId
from dotenv import load_dotenv
from pprint import pprint
import time

# Load environment variables
load_dotenv()

# API base URL
BASE_URL = "http://localhost:8000/api"

# MongoDB connection
MONGODB_URI = os.getenv("MONGODB_URI", "mongodb://localhost:27017")
DATABASE_NAME = os.getenv("DATABASE_NAME", "bashayer_db")
mongo_client = pymongo.MongoClient(MONGODB_URI)
db = mongo_client[DATABASE_NAME]

# Test data
test_data = {
    "users": {
        "regular_user": {
            "username": "testuser",
            "email": f"test_{int(time.time())}@example.com",
            "password": "testpassword",
            "role": "user"
        }
    },
    "clients": {
        "client1": {
            "name": "Test Client",
            "rate_card_file": None
        }
    },
    "agencies": {
        "agency1": {
            "name": "Test Agency",
            "client_id": "PLACEHOLDER_WILL_BE_UPDATED",  # this will hold client_code now
            "rate_card_file": None
        }
    },
    "invoice": {
        # These two will be set to agency_code and client_code respectively
        "agency_id": "PLACEHOLDER_AGENCY_CODE",
        "client_id": "PLACEHOLDER_CLIENT_CODE",
        "agency_invoice": {
            "metadata": {
                "invoice_number": "INV001",
                "amount": 100000,
                "date": "2023-07-15"
            }
        },
        "approved_actualized_plan": {},
        "job_order": {
            "metadata": {
                "order_number": "JO123",
                "date": "2023-07-10"
            }
        },
        "booking_order": {
            "metadata": {
                "order_number": "BO456",
                "platform": "Channel 5"
            }
        },
        "vendor_invoice": {
            "metadata": {
                "vendor_name": "Media Solutions",
                "phone": "+1-555-123-4567"
            }
        },
        "ad_appearance_proofs": [],
        "other_documents": []
    },
    "test_files": {
        "agency_invoice": "test_files/agency_invoice.pdf",
        "approved_plan": "test_files/approved_plan.xlsx",
        "actualized_plan": "test_files/actualized_plan.xlsx",
        "job_order": "test_files/job_order.pdf",
        "booking_order": "test_files/booking_order.pdf",
        "vendor_invoice": "test_files/vendor_invoice.pdf",
        "ad_appearance_proof": "test_files/ad_appearance_proof.jpg",
        "other": "test_files/other_document.pdf"
    }
}

# Tokens removed for initial development; endpoints are open
tokens = {
    "admin": None,
    "user": None
}

# Created entity IDs
created_ids = {
    "user_id": None,
    "client_code": None,
    "agency_code": None,
    "invoice_id": None
}

# Helper function for API requests with token
def api_request(method, endpoint, data=None, token=None, files=None):
    url = f"{BASE_URL}/{endpoint}"
    headers = {}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    
    if method == "GET":
        response = requests.get(url, headers=headers)
    elif method == "POST":
        if files:
            response = requests.post(url, headers=headers, files=files)
        else:
            headers["Content-Type"] = "application/json"
            response = requests.post(url, headers=headers, json=data)
    
    return response

# Helper function to check MongoDB
def check_mongo_collection(collection_name, query=None):
    if query is None:
        query = {}
    collection = db[collection_name]
    results = list(collection.find(query))
    
    # Convert ObjectIds to strings for better display
    for result in results:
        if "_id" in result:
            result["_id"] = str(result["_id"])
    
    return results

# Create test files directory and dummy files
def create_test_files():
    os.makedirs("test_files", exist_ok=True)
    
    # Create dummy files with minimal content
    for file_type, file_path in test_data["test_files"].items():
        with open(file_path, "w") as f:
            f.write(f"Test {file_type} file")

def test_signup_user():
    print("\n=== Test 1: Signup User ===")
    response = api_request("POST", "auth/signup", test_data["users"]["regular_user"])
    print(f"Status Code: {response.status_code}")
    assert response.status_code == 200, f"Signup failed: {response.text}"
    user_data = response.json()
    created_ids["user_id"] = user_data["id"]
    print("User signed up successfully!", user_data)

def test_login_user():
    print("\n=== Test 2: Login User ===")
    payload = {
        "email": test_data["users"]["regular_user"]["email"],
        "password": test_data["users"]["regular_user"]["password"],
    }
    response = api_request("POST", "auth/login", payload)
    print(f"Status Code: {response.status_code}")
    assert response.status_code == 200, f"Login failed: {response.text}"
    tokens["user"] = response.json()["access_token"]
    print("User login successful!")

# Test 2: Create a new user
def test_create_client():
    print("\n=== Test 3: Create Client ===")
    response = api_request("POST", "clients", test_data["clients"]["client1"], tokens["user"])  # token optional
    print(f"Status Code: {response.status_code}")
    assert response.status_code == 200, f"Create client failed: {response.text}"
    client_data = response.json()
    created_ids["client_code"] = client_data["client_code"]
    print("Client created successfully!", client_data)
    # Check MongoDB
    print("\nVerifying in MongoDB:")
    clients = check_mongo_collection("clients", {"client_code": created_ids["client_code"]})
    pprint(clients)

# Test 3: Login as the new user
def test_create_agency():
    print("\n=== Test 4: Create Agency ===")
    # Reference client by business code
    test_data["agencies"]["agency1"]["client_id"] = created_ids["client_code"]
    response = api_request("POST", "agencies", test_data["agencies"]["agency1"], tokens["user"])  # token optional
    print(f"Status Code: {response.status_code}")
    assert response.status_code == 200, f"Create agency failed: {response.text}"
    agency_data = response.json()
    created_ids["agency_code"] = agency_data["agency_code"]
    print("Agency created successfully!", agency_data)
    # Check MongoDB
    print("\nVerifying in MongoDB:")
    agencies = check_mongo_collection("agencies", {"agency_code": created_ids["agency_code"]})
    pprint(agencies)

# Test 4: Create a client (requires admin)
def test_create_invoice():
    print("\n=== Test 5: Create Invoice ===")
    # Set codes
    test_data["invoice"]["agency_id"] = created_ids["agency_code"]
    test_data["invoice"]["client_id"] = created_ids["client_code"]
    response = api_request("POST", "invoices", test_data["invoice"], tokens["user"])  # token optional
    print(f"Status Code: {response.status_code}")
    assert response.status_code == 200, f"Create invoice failed: {response.text}"
    invoice_data = response.json()
    created_ids["invoice_id"] = invoice_data["id"]
    print("Invoice created successfully!", invoice_data)
    # Check MongoDB
    print("\nVerifying in MongoDB:")
    invoices = check_mongo_collection("invoices", {"_id": ObjectId(created_ids["invoice_id"])})
    pprint(invoices)

# Test 5: Create an agency
def test_upload_files():
    print("\n=== Test 6: Upload Files ===")
    create_test_files()
    entity_id = created_ids["agency_code"]
    for doc_type, file_path in test_data["test_files"].items():
        print(f"\nUploading {doc_type}...")
        with open(file_path, "rb") as f:
            files = {"file": (os.path.basename(file_path), f)}
            response = api_request("POST", f"upload/{doc_type}/{entity_id}", token=tokens["user"], files=files)
            print(f"Status Code: {response.status_code}")
            assert response.status_code == 200, f"Upload {doc_type} failed: {response.text}"
            print("Uploaded.", response.json())

# Test 6: Create an invoice
def test_get_clients():
    print("\n=== Test 7: Get All Clients ===")
    response = api_request("GET", "clients", token=tokens["user"])  # token optional
    print(f"Status Code: {response.status_code}")
    assert response.status_code == 200, f"Get clients failed: {response.text}"
    print(f"Retrieved {len(response.json())} clients")

# Test 7: Upload files for the invoice
def test_get_agencies():
    print("\n=== Test 8: Get All Agencies ===")
    response = api_request("GET", "agencies", token=tokens["user"])  # token optional
    print(f"Status Code: {response.status_code}")
    assert response.status_code == 200, f"Get agencies failed: {response.text}"
    print(f"Retrieved {len(response.json())} agencies")
    # Filter by client_code
    client_code = created_ids["client_code"]
    response = api_request("GET", f"agencies?client_id={client_code}", token=tokens["user"])  # token optional
    print(f"Filtering by client_id={client_code} → Status {response.status_code}")
    assert response.status_code == 200

# Test 8: Get all clients
def test_get_invoices():
    print("\n=== Test 9: Get All Invoices ===")
    response = api_request("GET", "invoices", token=tokens["user"])  # token optional
    print(f"Status Code: {response.status_code}")
    assert response.status_code == 200, f"Get invoices failed: {response.text}"
    invoices = response.json()
    print(f"Retrieved {len(invoices)} invoices")
    # Get specific invoice by ID
    if created_ids["invoice_id"]:
        response = api_request("GET", f"invoices/{created_ids['invoice_id']}", token=tokens["user"])  # token optional
        print(f"Get invoice by ID → Status {response.status_code}")
        assert response.status_code == 200

# Test 9: Get all agencies
def run_tests():
    try:
        print("Starting API tests...")
        test_signup_user()
        test_login_user()
        test_create_client()
        test_create_agency()
        test_create_invoice()
        test_upload_files()
        test_get_clients()
        test_get_agencies()
        test_get_invoices()
        print("\n=== All Tests Completed Successfully! ===")
        print("\n=== Final MongoDB State ===")
        print("\nUsers Collection:")
        pprint(check_mongo_collection("users"))
        print("\nClients Collection:")
        pprint(check_mongo_collection("clients"))
        print("\nAgencies Collection:")
        pprint(check_mongo_collection("agencies"))
        print("\nInvoices Collection:")
        pprint(check_mongo_collection("invoices"))
    except AssertionError as e:
        print(f"\n❌ Test failed: {e}")
    except Exception as e:
        print(f"\n❌ Unexpected error: {e}")
    finally:
        # Clean up test files
        for _, file_path in test_data["test_files"].items():
            if os.path.exists(file_path):
                try:
                    os.remove(file_path)
                except:
                    pass
        try:
            if os.path.exists("test_files"):
                os.rmdir("test_files")
        except:
            pass

# Test 10: Get all invoices
def test_get_invoices():
    print("\n=== Test 10: Get All Invoices ===")
    response = api_request("GET", "invoices", token=tokens["user"])
    
    print(f"Status Code: {response.status_code}")
    if response.status_code == 200:
        invoices = response.json()
        print(f"Retrieved {len(invoices)} invoices")
        print(f"Response: {invoices}")
    else:
        print(f"Failed to get invoices: {response.text}")
    
    # Get specific invoice by ID
    if created_ids["invoice_id"]:
        response = api_request(
            "GET", 
            f"invoices/{created_ids['invoice_id']}", 
            token=tokens["user"]
        )
        
        print(f"\nGetting invoice by ID: {created_ids['invoice_id']}")
        print(f"Status Code: {response.status_code}")
        if response.status_code == 200:
            invoice = response.json()
            print(f"Retrieved invoice:")
            print(f"Response: {invoice}")
    
    assert response.status_code == 200, "Get invoices failed"

# Run all tests
def run_tests():
    try:
        print("Starting API tests...")
        test_signup_user()
        test_login_user()
        test_create_client()
        test_create_agency()
        test_create_invoice()
        test_upload_files()
        test_get_clients()
        test_get_agencies()
        test_get_invoices()
        
        print("\n=== All Tests Completed Successfully! ===")
        
        # Final MongoDB state
        print("\n=== Final MongoDB State ===")
        print("\nUsers Collection:")
        pprint(check_mongo_collection("users"))
        
        print("\nClients Collection:")
        pprint(check_mongo_collection("clients"))
        
        print("\nAgencies Collection:")
        pprint(check_mongo_collection("agencies"))
        
        print("\nInvoices Collection:")
        pprint(check_mongo_collection("invoices"))
        
    except AssertionError as e:
        print(f"\n❌ Test failed: {e}")
    except Exception as e:
        print(f"\n❌ Unexpected error: {e}")
    finally:
        # Clean up test files
        for _, file_path in test_data["test_files"].items():
            if os.path.exists(file_path):
                try:
                    os.remove(file_path)
                except:
                    pass
        
        try:
            if os.path.exists("test_files"):
                os.rmdir("test_files")
        except:
            pass

def gemini_testing(prompt: str, schema: dict):
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


if __name__ == "__main__":
    print(gemini_testing(prompt="Hello, world! how are you sir", schema={}))