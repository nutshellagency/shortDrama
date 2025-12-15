# Setup Guide: No Docker (Supabase + Local)

This guide addresses how to run the ShortDrama platform without Docker, using standard Windows execution for the code and Supabase for the infrastructure.

## Prerequisites

1.  **Node.js**: Installed (v18 or v20 recommended).
2.  **Python**: Installed (v3.11 recommended).
3.  **FFmpeg**: Installed locally and added to System PATH.
    *   To verify: Open PowerShell and run `ffmpeg -version`.
4.  **Supabase Account**: Free account at [supabase.com](https://supabase.com).

## 1. Cloud Infrastructure (Supabase)

### Step 1: Create Project
1.  Log in to [supabase.com](https://supabase.com/dashboard/projects).
2.  Click **"New Project"**.
3.  Choose your Organization.
4.  **Name**: `shortdrama` (or similar).
5.  **Database Password**: **IMPORTANT** - Generating a strong password and **SAVE IT**. You will need this for the connection string.
6.  **Region**: Choose the one closest to you (e.g., US East N. Virginia).
7.  Click **"Create new project"**. Wait a few minutes for it to finish setting up.

### Step 2: Get Database URL (`DATABASE_URL`)
1.  In your project dashboard, look at the left sidebar. Click the **Settings (Gear Icon)** at the bottom.
2.  Click **"Database"** in the inner configuration menu.
3.  Scroll down to the **"Connection string"** section.
4.  Click on the **"URI"** tab.
5.  **Critical**: Look for "Mode: Session" vs "Mode: Transaction".
    *   **Recommended**: Change the dropdown (or copy the separate Transaction string if shown) to use **Transaction** mode (port 6543) if you plan to deploy to serverless later. For local dev, **Session** (port 5432) is fine too.
    *   Copy the string. It looks like: `postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres`.
6.  **Action**: Paste this into your `.env` file as `DATABASE_URL`.
    *   *Note*: You must manually replace `[password]` with the password you created in Step 1.

### Step 3: Create Storage Buckets
1.  In the left sidebar, click on **"Storage"** (Box icon).
2.  Click **"New Bucket"**.
    *   Name: `shortdrama-raw`
    *   **Public bucket**: TOGGLE THIS ON (Make it public).
    *   Click "Save".
3.  Click **"New Bucket"** again.
    *   Name: `shortdrama-processed`
    *   **Public bucket**: TOGGLE THIS ON.
    *   Click "Save".

### Step 4: Get S3 Storage Credentials
1.  In the left sidebar, click **Settings (Gear Icon)** again.
2.  Click **"Storage"** in the configuration menu.
3.  Scroll to **"S3 Credentials"**.
4.  You will see:
    *   **Endpoint**: Copy this. (e.g., `https://[ref].supabase.co/storage/v1/s3`). Set this as `S3_ENDPOINT` in `.env`.
    *   **Region**: Copy this (e.g., `us-east-1`). Set this as `S3_REGION` in `.env`.
    *   **Access Keys**: You need to generate one.
5.  Click **"New Access Key"**.
    *   Name: `shortdrama-admin`
    *   Click "Create".
6.  **Copy the keys immediately**:
    *   **Access Key ID**: Copy and set as `S3_ACCESS_KEY` in `.env`.
    *   **Secret Access Key**: Copy and set as `S3_SECRET_KEY` in `.env`. (You won't see this again!).

## 2. Local Configuration

1.  Copy `config/env.supabase` to `.env`.
    ```powershell
    copy config\env.supabase .env
    ```
2.  Open `.env` and fill in the values you got from Supabase:
    *   `DATABASE_URL`: Your Supabase connection string for Transaction Mode (port 6543) or Session Mode (port 5432).
    *   `S3_ENDPOINT`: Your Supabase Storage S3 Endpoint.
    *   `S3_ACCESS_KEY`: Your Access Key ID.
    *   `S3_SECRET_KEY`: Your Secret Access Key.

## 3. Initialize Database

Run the following command to push the schema to your remote Supabase database:

```powershell
cd server
npm install
npx prisma db push
```

## 4. Run the API Server

In a PowerShell terminal:

```powershell
cd server
npm run dev
```

The server will start at `http://localhost:3000`. Access the admin panel at `http://localhost:3000/admin`.

## 5. Run the AI Worker

In a **separate** PowerShell terminal:

1.  Install dependencies:
    ```powershell
    cd worker
    pip install -r requirements.txt
    ```
2.  Run the worker:
    ```powershell
    python main.py
    ```

The worker is now polling for jobs. You can upload a video in the Admin UI, and the worker window should show it picking up the job, processing it (using your local FFmpeg), and uploading the result back to Supabase.
