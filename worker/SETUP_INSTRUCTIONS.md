# Worker Setup Instructions

## Prerequisites

### 1. Python Installation
- **Python 3.8+** is required
- Check your version: `python --version`

### 2. FFmpeg Installation
The worker uses FFmpeg for video processing. You need to install it:

#### Option A: Add FFmpeg to System PATH (Recommended)
1. Download FFmpeg from: https://ffmpeg.org/download.html
2. Extract to a location (e.g., `C:\ffmpeg`)
3. Add `C:\ffmpeg\bin` to your System PATH environment variable
4. Verify: Open a new terminal and run `ffmpeg -version`

#### Option B: Hardcoded Path
- If you install FFmpeg to `C:\ffmpeg\bin\ffmpeg.exe`, the worker will automatically detect it

### 3. Python Dependencies
Install all required packages:

```bash
cd c:\Users\Hassan\Apps\shortDrama\worker
pip install -r requirements.txt
```

This will install:
- `boto3` - AWS S3 client for Supabase Storage
- `requests` - HTTP client for API communication
- `mediapipe` - AI face detection for smart cropping
- `opencv-python-headless` - Video processing for face tracking
- `numpy` - Numerical operations
- `yt-dlp` - Download videos from YouTube/TikTok/Instagram
- `python-dotenv` - Load environment variables from .env file

## Environment Configuration

### 4. Create `.env` File
Create a `.env` file in the `worker` directory with the following configuration:

```bash
# API Server URL (Vercel deployment)
API_BASE_URL=https://your-api-server.vercel.app

# Worker Authentication Token
WORKER_TOKEN=your-worker-token

# Supabase Storage Configuration
SUPABASE_URL=https://your-project.supabase.co
S3_ENDPOINT=https://your-project.supabase.co/storage/v1/s3
S3_REGION=us-east-1
S3_ACCESS_KEY=your-supabase-service-key
S3_SECRET_KEY=your-supabase-service-key
S3_BUCKET_RAW=shortdrama-raw
S3_BUCKET_PROCESSED=shortdrama-processed
PUBLIC_S3_BASE_URL=https://your-project.supabase.co/storage/v1/object/public
```

### Required Environment Variables:

| Variable | Description | Example |
|----------|-------------|---------|
| `API_BASE_URL` | Your API server URL on Vercel | `https://shortdrama-api.vercel.app` |
| `WORKER_TOKEN` | Authentication token for worker | Same as in server `.env` |
| `SUPABASE_URL` | Your Supabase project URL | `https://xxxxx.supabase.co` |
| `S3_ENDPOINT` | Supabase S3 endpoint | `https://xxxxx.supabase.co/storage/v1/s3` |
| `S3_ACCESS_KEY` | Supabase service role key | From Supabase dashboard |
| `S3_SECRET_KEY` | Supabase service role key (same) | From Supabase dashboard |
| `S3_BUCKET_RAW` | Raw videos bucket | `shortdrama-raw` |
| `S3_BUCKET_PROCESSED` | Processed videos bucket | `shortdrama-processed` |

### Where to Find Values:

1. **API_BASE_URL**: Your Vercel deployment URL for the server
2. **WORKER_TOKEN**: Check your server's `.env` file or create a new secure token
3. **Supabase credentials**: 
   - Go to your Supabase project dashboard
   - Settings → API
   - Copy the `service_role` key for S3_ACCESS_KEY and S3_SECRET_KEY
   - Copy the project URL for SUPABASE_URL

## Running the Worker

### Start the Worker
```bash
cd c:\Users\Hassan\Apps\shortDrama\worker
python main.py
```

### Expected Output
```
[Worker] Smart crop module loaded successfully
job_claimed: <job_id> raw_key=<key> seg=180
[Worker] Downloading with yt-dlp: <url>
...
```

## Troubleshooting

### FFmpeg Not Found
- **Error**: `FileNotFoundError: ffmpeg`
- **Solution**: Install FFmpeg and add to PATH (see step 2 above)

### Connection Refused
- **Error**: `ECONNREFUSED` when claiming jobs
- **Solution**: Verify `API_BASE_URL` is correct and server is running on Vercel

### S3 Upload Failed
- **Error**: `AccessDenied` or `InvalidAccessKeyId`
- **Solution**: Verify Supabase credentials in `.env` file

### Module Import Errors
- **Error**: `ModuleNotFoundError: No module named 'mediapipe'`
- **Solution**: Run `pip install -r requirements.txt` again

## Features

The worker supports:
- ✅ **AI Smart Cropping**: Face-tracking vertical crop using MediaPipe
- ✅ **Auto-Split Series**: Splits long videos into episodes
- ✅ **YouTube/TikTok Download**: Downloads from social media URLs
- ✅ **Thumbnail Generation**: Creates thumbnails from video frames
- ✅ **Subtitle Placeholders**: Generates basic SRT files
- ✅ **Progress Reporting**: Real-time job progress updates to API

## Next Steps

After the worker is running:
1. Upload a video through the admin dashboard (on Vercel)
2. Create a series and trigger auto-split
3. Watch the worker process the job in real-time
4. Check the processed videos in Supabase Storage
