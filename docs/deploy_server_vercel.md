# Deploying Backend API to Vercel

## 1. Project Setup
You have already created the necessary Vercel configuration files:
- `server/api/serverless.ts`: The bridge between Vercel and your Fastify app.
- `server/vercel.json`: Tells Vercel how to route traffic.

## 2. Deployment Steps

Since your Viewer is already in the `viewer` folder, we will deploy the Server as a **separate Vercel Project** pointing to the **same Git repository** but using the `server` folder.

### Step-by-Step

1.  **Push changes to GitHub**
    ```bash
    git add .
    git commit -m "Add Vercel server config"
    git push
    ```

2.  **Go to Vercel Dashboard** → **"Add New Project"**
3.  **Import the SAME Repository** (`shortDrama`)
4.  **Configure Project:**
    *   **Project Name:** `shortdrama-api` (or similar)
    *   **Root Directory:** `server` (Click Edit to change this from root)
    *   **Framework Preset:** `Other` (or None/Vite, Vercel usually detects `package.json`). *Make sure "Include source files outside of the Root Directory" is unchecked if asked, but usually default is fine.*
    *   **Build Command:** `npm run build` (or leave empty if it just works with tsx, but typical node apps might need build. For this serverless setup, Vercel compiles the TS on the fly via the `api` folder).
        *   *Recommendation*: Leave default. Vercel automatically handles TypeScript in `api/` functions.

5.  **Environment Variables (Crucial!)**
    Copy these from your `.env` or `config/env.supabase`:
    *   `DATABASE_URL`
    *   `JWT_SECRET`
    *   `ADMIN_JWT_SECRET`
    *   `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `WORKER_TOKEN`
    *   `S3_ENDPOINT`, `S3_REGION`, `S3_ACCESS_KEY`, `S3_SECRET_KEY`
    *   `S3_BUCKET_RAW`, `S3_BUCKET_PROCESSED`, `PUBLIC_S3_BASE_URL`

6.  **Deploy!**

## 3. Connecting the Pieces

Once `shortdrama-api` is live, you will get a URL like `https://shortdrama-api.vercel.app`.

### Update Frontend
1.  Go to your **Viewer Project** on Vercel.
2.  Update Environment Variable:
    *   `NEXT_PUBLIC_API_URL` = `https://shortdrama-api.vercel.app`
3.  Redeploy Viewer.

### Update Worker (Local)
1.  On your local machine, edit `worker/.env` (or `.env` in root):
    *   `API_URL` = `https://shortdrama-api.vercel.app`
2.  Restart your local worker: `python main.py`

**Done!** Your system is now:
- **Viewer**: Vercel (Global)
- **API**: Vercel (Global)
- **Worker**: Your PC (Local)
