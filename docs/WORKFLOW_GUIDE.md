# ShortDrama Workflow Guide

This guide explains how to use the "Hybrid" workflow where you develop against a Local Docker Database but deploy to a Live Vercel/Supabase environment.

## 1. Initial Setup

1.  **Install Root Dependencies**:
    ```bash
    npm install
    ```

2.  **Verify Local Env**:
    Ensure `server/.env` contains your **Local** Docker connection:
    ```ini
    DATABASE_URL="postgresql://user:pass@localhost:5432/shortdrama?schema=public"
    ```

3.  **Create Production Env**:
    Create a new file `server/.env.production`.
    Add your **Live** Supabase connection string (Transaction Pooler recommended):
    ```ini
    DATABASE_URL="postgres://postgres.xxxx:[password]@aws-0-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true"
    ```
    *Note: Do NOT commit this file to Git.*

## 2. Daily Development (Local)

Run everything locally with one command:
```bash
npm run dev:all
```
This starts:
*   Docker Containers (DB, Redis, S3)
*   API Server (port 3001)
*   Viewer (port 3000)

**Database Changes:**
If you edit `schema.prisma`, update your **Local** DB:
```bash
npm run db:push:local
```

## 3. Deploying to Production

When you are ready to ship:

**Step A: Sync Database**
Apply your schema changes to the **Live** Supabase DB:
```bash
npm run db:push:prod
```

**Step B: Sync Code (Deploy)**
Just push to your main branch (Vercel auto-deploys):
```bash
git checkout main
git merge dev
git push origin main
```

## 4. Running the Worker

**Option A: Local Testing**
Processes jobs from your **Local Docker** database.
```bash
npm run worker:local
```

**Option B: Production Processing**
Processes jobs from the **Live** website (Supabase DB).
*Use this when an admin uploads a video to the live site and you want to process it efficiently on your computer.*
```bash
npm run worker:prod
```
