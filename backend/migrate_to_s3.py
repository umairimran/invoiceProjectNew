#!/usr/bin/env python3
"""
Migration script to move existing local files to S3 storage.
Run this script once to migrate all existing files from local storage to S3.
"""

import os
import asyncio
from pathlib import Path
from s3_service import get_s3_service

async def migrate_files_to_s3():
    """Migrate all existing files from local uploads directory to S3"""
    uploads_dir = Path("uploads")
    
    if not uploads_dir.exists():
        print("No uploads directory found. Nothing to migrate.")
        return
    
    try:
        s3_service = get_s3_service()
        print(f"Connected to S3 bucket: {s3_service.bucket_name}")
    except Exception as e:
        print(f"Failed to connect to S3: {e}")
        return
    
    migrated_count = 0
    failed_count = 0
    
    # Walk through all files in uploads directory
    for file_path in uploads_dir.rglob("*"):
        if file_path.is_file():
            try:
                # Read file content
                with open(file_path, "rb") as f:
                    file_content = f.read()
                
                # Generate S3 key (relative to uploads directory)
                relative_path = file_path.relative_to(uploads_dir)
                s3_key = f"uploads/{relative_path}"
                
                # Check if file already exists in S3
                if await s3_service.file_exists(s3_key):
                    print(f"Skipping {s3_key} (already exists in S3)")
                    continue
                
                # Determine content type
                import mimetypes
                content_type, _ = mimetypes.guess_type(str(file_path))
                if not content_type:
                    content_type = 'application/octet-stream'
                
                # Upload to S3
                await s3_service.upload_file(
                    file_content=file_content,
                    s3_key=s3_key,
                    content_type=content_type
                )
                
                print(f"Migrated: {file_path} -> {s3_key}")
                migrated_count += 1
                
            except Exception as e:
                print(f"Failed to migrate {file_path}: {e}")
                failed_count += 1
    
    print(f"\nMigration completed:")
    print(f"  - Migrated: {migrated_count} files")
    print(f"  - Failed: {failed_count} files")
    
    if migrated_count > 0:
        print(f"\nNote: After verifying the migration, you can safely delete the local 'uploads' directory.")
        print(f"All files are now stored in S3 bucket: {s3_service.bucket_name}")

async def verify_migration():
    """Verify that files exist in S3"""
    try:
        s3_service = get_s3_service()
        print(f"Verifying files in S3 bucket: {s3_service.bucket_name}")
        
        # List all files in S3
        files = await s3_service.list_files("uploads/")
        print(f"Found {len(files)} files in S3")
        
        for file_info in files[:10]:  # Show first 10 files
            print(f"  - {file_info['key']} ({file_info['size']} bytes)")
        
        if len(files) > 10:
            print(f"  ... and {len(files) - 10} more files")
            
    except Exception as e:
        print(f"Failed to verify migration: {e}")

if __name__ == "__main__":
    import sys
    
    if len(sys.argv) > 1 and sys.argv[1] == "verify":
        asyncio.run(verify_migration())
    else:
        print("Starting migration of local files to S3...")
        print("Make sure you have set up your AWS credentials and S3 bucket.")
        print("Run with 'verify' argument to check existing files in S3.")
        print()
        
        response = input("Do you want to proceed with migration? (y/N): ")
        if response.lower() in ['y', 'yes']:
            asyncio.run(migrate_files_to_s3())
        else:
            print("Migration cancelled.")
