# Hybrid Deployment Guide: Fully Serverless + Local Worker

This guide explains how to deploy **ShortDrama** without renting a VPS.
- **Viewer**: Vercel (Next.js)
- **API Server**: Vercel (Fastify Serverless Functions)
- **Worker**: Your Local Machine (or any spare computer)
- **Database/Storage**: Supabase (Cloud)

## Why this works?
Processing video is heavy/expensive (requires GPU/CPU). Web traffic is light (requires Network).
By running the **Worker on your laptop**, you save \$20-50/mo on VPS costs. Vercel handles the web traffic for free (hobby tier) or cheap.

---

## Part 1: Deploy API Server to Vercel

1.  **Push to GitHub**
    Ensure your latest code is on GitHub.

2.  **Import to Vercel**
    - Go to Vercel Dashboard -> **Add New Project**.
    - Select your `shortDrama` repository.

3.  **Configure Project**
    - **Project Name**: `shortdrama-api`
    - **Root Directory**: `server` (Edit -> select `server` folder).
    - **Framework Preset**: `Other` (or default).
    - **Build Command**: Leave default (Vercel handles `api/serverless.ts`).

4.  **Environment Variables**
    Add these from your `.env`:
    - `DATABASE_URL` (From Supabase Connection String -> Transaction Pooler recommended `port 6543`)
    - `JWT_SECRET`
    - `ADMIN_JWT_SECRET`
    - `ADMIN_EMAIL`
    - `ADMIN_PASSWORD`
    - `WORKER_TOKEN`
    - `S3_ENDPOINT`, `S3_REGION`, `S3_ACCESS_KEY`, `S3_SECRET_KEY`
    - `S3_BUCKET_RAW`, `S3_BUCKET_PROCESSED`, `PUBLIC_S3_BASE_URL`

5.  **Deploy**
    - Click **Deploy**.
    - Once finished, copy the domain (e.g., `https://shortdrama-api.vercel.app`).

---

## Part 2: Deploy Viewer to Vercel

1.  **Import to Vercel** (Again)
    - Go to Dashboard -> **Add New Project**.
    - Select the SAME `shortDrama` repository.

2.  **Configure Project**
    - **Project Name**: `shortdrama-web`
    - **Root Directory**: `viewer` (Edit -> select `viewer` folder).
    - **Framework Preset**: `Next.js`.

3.  **Environment Variables**
    - `NEXT_PUBLIC_API_URL`: Paste your API URL (e.g., `https://shortdrama-api.vercel.app`)
    - `NEXT_PUBLIC_SUPABASE_URL`: (Optional, if you use direct supabase clients, but mostly handled by API).

4.  **Deploy**
    - Click **Deploy**.
    - You now have your live website!

---

## Part 3: Run Worker Locally

The worker will run on your computer, pull jobs from the live database, process them, and upload results to Supabase.

1.  **Configure Local Worker**
    - Open `worker/.env` (or create it).
    - Set `API_URL` to your **LIVE API** (not localhost):
      ```ini
      API_URL=https://shortdrama-api.vercel.app
      WORKER_TOKEN=your-worker-token
      ```
    - Ensure `S3_` variables are set (they should match live keys).

2.  **Run Handling**
    - Run the worker:
      ```bash
      cd worker
      python main.py
      ```

3.  **Workflow**
    - Go to `https://shortdrama-web.vercel.app/admin`.
    - Upload a raw video.
    - Click "Auto-Split" or "Process".
    - Watch your **local terminal**. The Python script will wake up, download the video, process it, and upload the result.
    - Refresh the live website. The episode is now live!

## troubleshooting

-   **Database**: Ensure Vercel connects to Supabase. If you get connection errors, use the **Session Mode** connection string (port 5432) instead of Transaction Pooler for Serverless, OR ensure `pgbouncer=true` is in the connection string.
-   **Cold Starts**: The API might take 1-2s to wake up on the first request. This is normal for Serverless.
