# S3 Integration for File Storage

This document explains how the file storage system has been migrated from local storage to Amazon S3.

## Overview

The application now uses Amazon S3 for storing all uploaded files instead of local file system storage. This provides better scalability, reliability, and performance.

## Environment Variables

Add the following environment variables to your `.env` file:

```env
# AWS S3 Configuration
AWS_ACCESS_KEY_ID=your-aws-access-key-id
AWS_SECRET_ACCESS_KEY=your-aws-secret-access-key
AWS_REGION=us-east-1
S3_BUCKET_NAME=your-s3-bucket-name

# Optional: S3 Configuration
# S3_ENDPOINT_URL=https://s3.amazonaws.com  # For custom S3-compatible services
# S3_FORCE_PATH_STYLE=false  # Set to true for some S3-compatible services
```

## AWS Setup

### 1. Create an S3 Bucket

1. Go to AWS S3 Console
2. Create a new bucket with a unique name
3. Configure bucket settings:
   - **Region**: Choose your preferred region
   - **Block Public Access**: Keep default settings (recommended for security)
   - **Bucket Versioning**: Optional, but recommended for data protection

### 2. Create IAM User

1. Go to AWS IAM Console
2. Create a new user for the application
3. Attach the following policy (replace `your-bucket-name` with your actual bucket name):

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "s3:GetObject",
                "s3:PutObject",
                "s3:DeleteObject",
                "s3:ListBucket"
            ],
            "Resource": [
                "arn:aws:s3:::your-bucket-name",
                "arn:aws:s3:::your-bucket-name/*"
            ]
        }
    ]
}
```

4. Create access keys for the user
5. Add the access keys to your `.env` file

## File Structure in S3

Files are organized in S3 with the following structure:

```
your-bucket-name/
├── uploads/
│   ├── agency_invoice/
│   │   └── AGY-123_agency_invoice_1234567890_invoice.pdf
│   ├── approved_quotation/
│   │   └── AGY-123_approved_quotation_1234567890_quote.pdf
│   ├── job_order/
│   │   └── AGY-123_job_order_1234567890_order.pdf
│   ├── rate_card/
│   │   └── CLT-456_rate_card_1234567890_rates.xlsx
│   └── jobs/
│       └── 68b71f6b73d950590d63e7db/
│           ├── agency_invoice/
│           │   └── uuid-filename.pdf
│           └── approved_quotation/
│               └── uuid-filename.xlsx
```

## Migration from Local Storage

If you have existing files in local storage, use the migration script:

```bash
# Install dependencies first
pip install -r requirements.txt

# Run migration
python migrate_to_s3.py

# Verify migration
python migrate_to_s3.py verify
```

## API Changes

### File Upload Response

The upload endpoints now return additional S3 information:

```json
{
    "filename": "AGY-123_agency_invoice_1234567890_invoice.pdf",
    "file_path": "uploads/agency_invoice/AGY-123_agency_invoice_1234567890_invoice.pdf",
    "s3_key": "uploads/agency_invoice/AGY-123_agency_invoice_1234567890_invoice.pdf",
    "file_url": "https://your-bucket.s3.us-east-1.amazonaws.com/uploads/agency_invoice/AGY-123_agency_invoice_1234567890_invoice.pdf",
    "size": 1024000
}
```

### File Access

Files are now accessed via presigned URLs that expire after 1 hour. The `/api/files/{filename}` endpoint now redirects to S3 instead of serving files directly.

## Benefits of S3 Integration

1. **Scalability**: No storage limits on the server
2. **Reliability**: AWS S3 provides 99.999999999% (11 9's) durability
3. **Performance**: Global CDN-like access to files
4. **Cost-effective**: Pay only for what you use
5. **Backup**: Built-in redundancy and backup capabilities
6. **Security**: Fine-grained access control and encryption

## Security Considerations

1. **Access Keys**: Store AWS credentials securely in environment variables
2. **Bucket Permissions**: Use least-privilege IAM policies
3. **File Access**: Files are accessed via presigned URLs with expiration
4. **Encryption**: Files are encrypted at rest in S3 (AES256)

## Troubleshooting

### Common Issues

1. **AWS Credentials Error**
   - Verify `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY` are correct
   - Check IAM user permissions

2. **Bucket Not Found**
   - Verify `S3_BUCKET_NAME` matches your actual bucket name
   - Ensure bucket exists in the specified region

3. **Permission Denied**
   - Check IAM policy includes required S3 permissions
   - Verify bucket policy allows the IAM user access

4. **File Not Found**
   - Check if file exists in S3 using AWS Console
   - Verify S3 key format matches expected pattern

### Debug Mode

Enable debug logging by setting:

```env
AWS_LOG_LEVEL=DEBUG
```

## Testing

Run the test script to verify S3 integration:

```bash
python test_s3_integration.py
```

This will test:
- S3 connection
- File upload
- File existence check
- File info retrieval
- Presigned URL generation
- File listing
- File deletion

## Monitoring

Monitor your S3 usage through:
- AWS CloudWatch metrics
- S3 storage class analysis
- Cost and billing reports

## Backup Strategy

S3 provides built-in redundancy, but consider:
- Cross-region replication for critical data
- Lifecycle policies for cost optimization
- Regular backup verification

## Cost Optimization

1. **Storage Classes**: Use appropriate storage classes (Standard, IA, Glacier)
2. **Lifecycle Policies**: Automatically transition old files to cheaper storage
3. **Monitoring**: Set up billing alerts
4. **Cleanup**: Regularly delete unused files

## Support

For issues related to S3 integration:
1. Check AWS CloudTrail for API call logs
2. Review S3 access logs
3. Monitor application logs for S3-related errors
4. Consult AWS documentation for S3-specific issues
