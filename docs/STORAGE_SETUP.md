# Storage Setup - Backblaze B2

## Overview

SimpleV2 uses Backblaze B2 for file storage (fotos, videos, documentos). B2 is an S3-compatible, cost-effective solution ideal for production.

## Cost Estimation

For 100-500 listings with 5-10 photos each (~10GB/month transferred):

- **Storage**: ~$0.005/GB/month = ~$0.05/month for 10GB
- **Download/Transfer**: ~$0.01/GB = ~$0.10/month for 10GB
- **Total**: ~$0.15/month (incredibly cheap)

## Setup Instructions

### 1. Create a Backblaze B2 Account

1. Go to https://www.backblaze.com/b2/cloud-storage.html
2. Sign up (free tier: 10GB storage)
3. Create a bucket (e.g., `simple-media`)
4. Keep the bucket private

### 2. Generate API Credentials

1. In B2 console, go to **Account** → **App Keys**
2. Create a new **application key**:
   - **Allowed capabilities**: `listBuckets`, `readBucketInfo`, `uploadFile`, `readFileInfo`
   - **Bucket**: Select your bucket (or `All`)
   - Copy the **Application Key ID** and **Application Key**

### 3. Set Environment Variables

```bash
# services/api/.env
STORAGE_PROVIDER=backblaze-b2
BACKBLAZE_APP_KEY_ID=your_app_key_id
BACKBLAZE_APP_KEY=your_app_key
BACKBLAZE_BUCKET_ID=your_bucket_id
BACKBLAZE_BUCKET_NAME=your_bucket_name
BACKBLAZE_DOWNLOAD_URL=https://yourdownloadurl.backblazeb2.com
```

### 4. Find Your Bucket Details

In B2 console:
- **Bucket ID**: Shown under bucket details
- **Bucket Name**: The name you chose
- **Download URL**: In bucket settings → "Friendly URL" or "S3-like URL"

## How It Works

1. **Frontend** uploads file to backend
2. **Backend API** receives file via `/api/media/upload`
3. **Storage Provider** uploads to B2 and returns public URL
4. **URL is stored** in database (not the file content)
5. **Frontend displays** file using public URL

## Future Scalability

The `StorageProvider` is an abstraction layer. Easy switches:

- **AWS S3**: Replace BackblazeB2Provider with S3Provider
- **MinIO** (self-hosted): Replace with MinIOProvider
- **CDN**: Add CloudFlare in front without code changes

## Testing

```bash
# Check if B2 is configured correctly
curl -X POST http://localhost:4000/api/media/upload \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "file=@photo.jpg" \
  -F "fileType=image"
```

## Troubleshooting

- **"Missing required Backblaze B2 environment variables"**: Ensure all env vars are set
- **"Failed to authorize"**: Check credentials are correct
- **"Upload failed"**: Check bucket permissions and quota
