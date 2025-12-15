# Worker Quick Start Guide

## ✅ Installation Complete!

All dependencies have been installed successfully:
- ✓ Python 3.11.0
- ✓ FFmpeg 8.0
- ✓ All Python packages (boto3, mediapipe, opencv, numpy, yt-dlp, etc.)

## 📋 Next Steps

### 1. Configure Environment Variables

You need to create a `.env` file with your actual credentials:

```bash
# Copy the template
copy .env.template .env

# Then edit .env with your actual values
notepad .env
```

### 2. Get Your Credentials

#### From Your Server (Vercel)
- **API_BASE_URL**: Your Vercel deployment URL (e.g., `https://shortdrama-api.vercel.app`)
- **WORKER_TOKEN**: Check your server's environment variables on Vercel

#### From Supabase Dashboard
1. Go to your Supabase project: https://app.supabase.com
2. Navigate to: **Settings → API**
3. Copy these values:
   - **Project URL** → Use for `SUPABASE_URL`
   - **Service Role Key** → Use for both `S3_ACCESS_KEY` and `S3_SECRET_KEY`
4. Construct `S3_ENDPOINT`: `{SUPABASE_URL}/storage/v1/s3`

#### Example `.env` file:
```bash
API_BASE_URL=https://shortdrama-api.vercel.app
WORKER_TOKEN=your-secret-worker-token-123

SUPABASE_URL=https://abcdefgh.supabase.co
S3_ENDPOINT=https://abcdefgh.supabase.co/storage/v1/s3
S3_REGION=us-east-1
S3_ACCESS_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
S3_SECRET_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
S3_BUCKET_RAW=shortdrama-raw
S3_BUCKET_PROCESSED=shortdrama-processed
PUBLIC_S3_BASE_URL=https://abcdefgh.supabase.co/storage/v1/object/public
```

### 3. Verify Configuration

Run the verification script:
```bash
python verify_setup.py
```

### 4. Start the Worker

Once everything is configured:
```bash
python main.py
```

## 🔍 Expected Behavior

When the worker starts successfully, you should see:
```
[Worker] Smart crop module loaded successfully
```

Then it will poll for jobs every 2 seconds. When a job is available:
```
job_claimed: <job_id> raw_key=<video_key>
[Worker] Job <job_id>: Analyzing video for smart crop...
[Worker] Job <job_id>: Smart crop strategy: face_tracking
...
job_completed: <job_id>
```

## 🐛 Troubleshooting

### Worker can't connect to API
- **Error**: `Connection refused` or `timeout`
- **Fix**: Verify `API_BASE_URL` is correct and your Vercel server is running

### S3 upload fails
- **Error**: `AccessDenied` or `InvalidAccessKeyId`
- **Fix**: Double-check your Supabase service role key in `.env`

### FFmpeg errors
- **Error**: `FileNotFoundError: ffmpeg`
- **Fix**: FFmpeg is already installed and working on your system ✓

### No jobs available
- This is normal! The worker waits for jobs from the admin dashboard
- Upload a video through your Vercel admin interface to create jobs

## 📚 What the Worker Does

1. **Polls API** for pending video processing jobs
2. **Downloads** raw videos from Supabase Storage (or YouTube/TikTok URLs)
3. **Processes** videos:
   - AI-powered face tracking for smart vertical crop (9:16)
   - Splits long videos into episodes
   - Generates thumbnails
   - Creates subtitle placeholders
4. **Uploads** processed content back to Supabase Storage
5. **Reports** progress and completion to the API

## 🎯 Testing the Worker

1. Go to your admin dashboard (Vercel URL)
2. Upload a test video
3. Create a series and trigger auto-split
4. Watch the worker terminal for processing logs
5. Check Supabase Storage for processed videos

## 📁 File Structure

```
worker/
├── main.py              # Main worker script
├── smart_crop.py        # AI face tracking module
├── requirements.txt     # Python dependencies
├── .env                 # Your credentials (create this!)
├── .env.template        # Template for .env
├── verify_setup.py      # Setup verification script
└── SETUP_INSTRUCTIONS.md # Detailed setup guide
```

## 🚀 You're Ready!

All technical requirements are installed. Just configure your `.env` file and start the worker!
