#!/usr/bin/env python3
"""
Test script to verify S3 integration is working correctly.
Run this script to test the S3 service functionality.
"""

import asyncio
import os
import tempfile
from s3_service import get_s3_service
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

async def test_s3_connection():
    """Test basic S3 connection and bucket access"""
    print("Testing S3 connection...")
    try:
        s3_service = get_s3_service()
        print(f"✓ Connected to S3 bucket: {s3_service.bucket_name}")
        return s3_service
    except Exception as e:
        print(f"✗ Failed to connect to S3: {e}")
        return None

async def test_file_upload(s3_service):
    """Test file upload functionality"""
    print("\nTesting file upload...")
    try:
        # Create a test file
        test_content = b"This is a test file for S3 integration."
        test_key = "test/test_file.txt"
        
        # Upload file
        result = await s3_service.upload_file(
            file_content=test_content,
            s3_key=test_key,
            content_type="text/plain"
        )
        
        print(f"✓ File uploaded successfully")
        print(f"  - S3 Key: {result['s3_key']}")
        print(f"  - File URL: {result['file_url']}")
        print(f"  - Size: {result['size']} bytes")
        
        return test_key
        
    except Exception as e:
        print(f"✗ File upload failed: {e}")
        return None

async def test_file_exists(s3_service, test_key):
    """Test file existence check"""
    print(f"\nTesting file existence check for: {test_key}")
    try:
        exists = await s3_service.file_exists(test_key)
        if exists:
            print("✓ File exists in S3")
        else:
            print("✗ File does not exist in S3")
        return exists
    except Exception as e:
        print(f"✗ File existence check failed: {e}")
        return False

async def test_file_info(s3_service, test_key):
    """Test file info retrieval"""
    print(f"\nTesting file info retrieval for: {test_key}")
    try:
        info = await s3_service.get_file_info(test_key)
        if info:
            print("✓ File info retrieved successfully")
            print(f"  - Size: {info['size']} bytes")
            print(f"  - Content Type: {info['content_type']}")
            print(f"  - Last Modified: {info['last_modified']}")
        else:
            print("✗ File info not found")
        return info is not None
    except Exception as e:
        print(f"✗ File info retrieval failed: {e}")
        return False

async def test_presigned_url(s3_service, test_key):
    """Test presigned URL generation"""
    print(f"\nTesting presigned URL generation for: {test_key}")
    try:
        url = s3_service.generate_presigned_url(test_key, expiration=3600)
        print("✓ Presigned URL generated successfully")
        print(f"  - URL: {url[:100]}...")
        return True
    except Exception as e:
        print(f"✗ Presigned URL generation failed: {e}")
        return False

async def test_file_listing(s3_service):
    """Test file listing functionality"""
    print("\nTesting file listing...")
    try:
        files = await s3_service.list_files("test/")
        print(f"✓ Found {len(files)} files in test/ directory")
        for file_info in files:
            print(f"  - {file_info['filename']} ({file_info['size']} bytes)")
        return True
    except Exception as e:
        print(f"✗ File listing failed: {e}")
        return False

async def test_file_deletion(s3_service, test_key):
    """Test file deletion"""
    print(f"\nTesting file deletion for: {test_key}")
    try:
        success = await s3_service.delete_file(test_key)
        if success:
            print("✓ File deleted successfully")
        else:
            print("✗ File deletion failed")
        return success
    except Exception as e:
        print(f"✗ File deletion failed: {e}")
        return False

async def run_all_tests():
    """Run all S3 integration tests"""
    print("=" * 60)
    print("S3 Integration Test Suite")
    print("=" * 60)
    
    # Test connection
    s3_service = await test_s3_connection()
    if not s3_service:
        print("\n❌ S3 connection failed. Please check your configuration.")
        return
    
    # Test file upload
    test_key = await test_file_upload(s3_service)
    if not test_key:
        print("\n❌ File upload test failed.")
        return
    
    # Test file existence
    exists = await test_file_exists(s3_service, test_key)
    if not exists:
        print("\n❌ File existence test failed.")
        return
    
    # Test file info
    info_ok = await test_file_info(s3_service, test_key)
    if not info_ok:
        print("\n❌ File info test failed.")
        return
    
    # Test presigned URL
    url_ok = await test_presigned_url(s3_service, test_key)
    if not url_ok:
        print("\n❌ Presigned URL test failed.")
        return
    
    # Test file listing
    list_ok = await test_file_listing(s3_service)
    if not list_ok:
        print("\n❌ File listing test failed.")
        return
    
    # Test file deletion
    delete_ok = await test_file_deletion(s3_service, test_key)
    if not delete_ok:
        print("\n❌ File deletion test failed.")
        return
    
    print("\n" + "=" * 60)
    print("✅ All S3 integration tests passed!")
    print("Your S3 integration is working correctly.")
    print("=" * 60)

if __name__ == "__main__":
    # Check environment variables
    required_vars = ["AWS_ACCESS_KEY_ID", "AWS_SECRET_ACCESS_KEY", "S3_BUCKET_NAME"]
    missing_vars = [var for var in required_vars if not os.getenv(var)]
    
    if missing_vars:
        print("❌ Missing required environment variables:")
        for var in missing_vars:
            print(f"  - {var}")
        print("\nPlease set these variables in your .env file.")
        exit(1)
    
    # Run tests
    asyncio.run(run_all_tests())
