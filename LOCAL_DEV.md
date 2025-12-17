# Local Development Workflow

This guide explains how to set up and run ShortDrama locally using Docker for infrastructure (Postgres, Minio) and running the applications on your host machine for the best development experience (debugging, hot-reloading).

## Prerequisites

- Docker & Docker Compose
- Node.js (v18+)
- Python (v3.10+)
- FFmpeg (for Worker)

## 1. Start Infrastructure

Start the database and object storage services:

```bash
docker-compose -f docker-compose.dev.yml up -d
```

This spins up:
- **Postgres** (Port 5432): `postgresql://shortdrama:shortdrama@localhost:5432/shortdrama`
- **Minio** (S3 Implementation):
    - Console: http://localhost:9001 (User: `minioadmin`, Pass: `minioadmin`)
    - API: http://localhost:9000
    - Buckets: `shortdrama-raw`, `shortdrama-processed` (Public)

## 2. Configure Environment Variables

Ensure your local `.env` files point to these local services.

### Server (`server/.env`)
```bash
DATABASE_URL=postgresql://shortdrama:shortdrama@localhost:5432/shortdrama
S3_ENDPOINT=http://localhost:9000
S3_REGION=us-east-1
S3_ACCESS_KEY=minioadmin
S3_SECRET_KEY=minioadmin
S3_BUCKET_RAW=shortdrama-raw
S3_BUCKET_PROCESSED=shortdrama-processed
PUBLIC_S3_BASE_URL=http://localhost:9000/shortdrama-processed
```

### Worker (`worker/.env`)
```bash
API_URL=http://localhost:3000
S3_ENDPOINT=http://localhost:9000
S3_ACCESS_KEY=minioadmin
S3_SECRET_KEY=minioadmin
```

### Viewer (`viewer/.env.local`)
```bash
NEXT_PUBLIC_API_URL=http://localhost:3000
NEXT_PUBLIC_SUPABASE_URL=http://localhost:9000 # Used for constructing URLs purely client-side if needed
```

## 3. Run Applications

**Terminal 1: Server**
```bash
cd server
npm run dev
# Run this once if DB is empty:
# npm run db:push
```

**Terminal 2: Worker**
```bash
cd worker
# Activate venv if used
python main.py
```

**Terminal 3: Viewer**
```bash
cd viewer
npm run dev
```

## 4. Debugging & Testing

- **Server**: Available at http://localhost:3000
- **Viewer**: Available at http://localhost:3001
- **Minio Console**: http://localhost:9001 (Use this to inspect uploaded files)

## 5. Stopping

```bash
docker-compose -f docker-compose.dev.yml down
```
