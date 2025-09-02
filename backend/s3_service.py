import os
import boto3
from botocore.exceptions import ClientError, NoCredentialsError
from fastapi import HTTPException
from typing import Optional, Dict, Any
import mimetypes
from datetime import datetime, timezone
import uuid

class S3Service:
    def __init__(self):
        """Initialize S3 service with environment variables"""
        self.aws_access_key_id = os.getenv("AWS_ACCESS_KEY_ID")
        self.aws_secret_access_key = os.getenv("AWS_SECRET_ACCESS_KEY")
        self.aws_region = os.getenv("AWS_REGION", "us-east-1")
        self.bucket_name = os.getenv("S3_BUCKET_NAME")
        
        if not all([self.aws_access_key_id, self.aws_secret_access_key, self.bucket_name]):
            raise ValueError("Missing required AWS environment variables: AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, S3_BUCKET_NAME")
        
        # Initialize S3 client
        try:
            self.s3_client = boto3.client(
                's3',
                aws_access_key_id=self.aws_access_key_id,
                aws_secret_access_key=self.aws_secret_access_key,
                region_name=self.aws_region
            )
            
            # Test connection by checking if bucket exists
            self.s3_client.head_bucket(Bucket=self.bucket_name)
            print(f"S3 service initialized successfully with bucket: {self.bucket_name}")
            
        except NoCredentialsError:
            raise HTTPException(status_code=500, detail="AWS credentials not found")
        except ClientError as e:
            error_code = e.response['Error']['Code']
            if error_code == '404':
                raise HTTPException(status_code=500, detail=f"S3 bucket '{self.bucket_name}' not found")
            else:
                raise HTTPException(status_code=500, detail=f"AWS S3 error: {str(e)}")
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to initialize S3 service: {str(e)}")

    def generate_s3_key(self, document_type: str, entity_id: str, filename: str) -> str:
        """Generate a unique S3 key for the file"""
        timestamp = int(datetime.now(timezone.utc).timestamp())
        file_extension = os.path.splitext(filename)[1]
        unique_filename = f"{entity_id}_{document_type}_{timestamp}_{filename}"
        return f"uploads/{document_type}/{unique_filename}"

    def generate_job_s3_key(self, job_id: str, folder_type: str, filename: str) -> str:
        """Generate a unique S3 key for job documents"""
        file_extension = os.path.splitext(filename)[1]
        unique_filename = f"{uuid.uuid4()}{file_extension}"
        return f"uploads/jobs/{job_id}/{folder_type}/{unique_filename}"

    async def upload_file(self, file_content: bytes, s3_key: str, content_type: Optional[str] = None) -> Dict[str, Any]:
        """Upload file to S3"""
        try:
            # Determine content type if not provided
            if not content_type:
                content_type, _ = mimetypes.guess_type(s3_key)
                if not content_type:
                    content_type = 'application/octet-stream'
            
            # Upload to S3
            self.s3_client.put_object(
                Bucket=self.bucket_name,
                Key=s3_key,
                Body=file_content,
                ContentType=content_type,
                ServerSideEncryption='AES256'
            )
            
            # Generate public URL
            file_url = f"https://{self.bucket_name}.s3.{self.aws_region}.amazonaws.com/{s3_key}"
            
            return {
                "s3_key": s3_key,
                "file_url": file_url,
                "bucket": self.bucket_name,
                "content_type": content_type,
                "size": len(file_content)
            }
            
        except ClientError as e:
            raise HTTPException(status_code=500, detail=f"Failed to upload file to S3: {str(e)}")
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Unexpected error uploading file: {str(e)}")

    async def delete_file(self, s3_key: str) -> bool:
        """Delete file from S3"""
        try:
            self.s3_client.delete_object(Bucket=self.bucket_name, Key=s3_key)
            return True
        except ClientError as e:
            if e.response['Error']['Code'] == 'NoSuchKey':
                return False  # File doesn't exist
            raise HTTPException(status_code=500, detail=f"Failed to delete file from S3: {str(e)}")
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Unexpected error deleting file: {str(e)}")

    async def file_exists(self, s3_key: str) -> bool:
        """Check if file exists in S3"""
        try:
            self.s3_client.head_object(Bucket=self.bucket_name, Key=s3_key)
            return True
        except ClientError as e:
            if e.response['Error']['Code'] == '404':
                return False
            raise HTTPException(status_code=500, detail=f"Error checking file existence: {str(e)}")

    async def get_file_info(self, s3_key: str) -> Optional[Dict[str, Any]]:
        """Get file information from S3"""
        try:
            response = self.s3_client.head_object(Bucket=self.bucket_name, Key=s3_key)
            return {
                "size": response['ContentLength'],
                "last_modified": response['LastModified'],
                "content_type": response.get('ContentType', 'application/octet-stream'),
                "etag": response['ETag']
            }
        except ClientError as e:
            if e.response['Error']['Code'] == '404':
                return None
            raise HTTPException(status_code=500, detail=f"Error getting file info: {str(e)}")

    async def list_files(self, prefix: str) -> list:
        """List files in S3 with given prefix"""
        try:
            response = self.s3_client.list_objects_v2(
                Bucket=self.bucket_name,
                Prefix=prefix
            )
            
            files = []
            if 'Contents' in response:
                for obj in response['Contents']:
                    files.append({
                        "key": obj['Key'],
                        "size": obj['Size'],
                        "last_modified": obj['LastModified'],
                        "filename": os.path.basename(obj['Key'])
                    })
            
            return files
        except ClientError as e:
            raise HTTPException(status_code=500, detail=f"Error listing files: {str(e)}")

    def generate_presigned_url(self, s3_key: str, expiration: int = 3600) -> str:
        """Generate a presigned URL for file access"""
        try:
            url = self.s3_client.generate_presigned_url(
                'get_object',
                Params={'Bucket': self.bucket_name, 'Key': s3_key},
                ExpiresIn=expiration
            )
            return url
        except ClientError as e:
            raise HTTPException(status_code=500, detail=f"Error generating presigned URL: {str(e)}")

# Global S3 service instance
s3_service = None

def get_s3_service() -> S3Service:
    """Get or create S3 service instance"""
    global s3_service
    if s3_service is None:
        s3_service = S3Service()
    return s3_service
