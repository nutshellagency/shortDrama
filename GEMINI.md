# ShortDrama - Short-Form Video Platform

## Project Overview

ShortDrama is a video processing and delivery platform for short-form drama content. Admins upload raw videos which are processed by an AI worker to produce vertical videos, thumbnails, and subtitles. The processed videos are then made available to viewers through a web interface with a freemium monetization model (ads + coins).

## Architecture

The project consists of three main components:

* **API Server** (`/server`): Node.js application built with Fastify and TypeScript. Provides RESTful API for admin dashboard and viewer app. Uses Prisma ORM with PostgreSQL.

* **AI Worker** (`/worker`): Python script using FFmpeg and MediaPipe. Polls the API for jobs, downloads raw videos, processes them (vertical crop, thumbnails, subtitles), and uploads results to storage.

* **Viewer App** (`/viewer`): Next.js application deployable to Vercel. Connects to the API server for content delivery. Built using an **Atomic Design System** with a premium dark theme.

## Frontend Architecture (Viewer)

The viewer application follows the Atomic Design methodology:
- **Atoms**: Basic building blocks (Buttons, Icons, Typography).
- **Molecules**: Simple groups of UI elements (SeriesCard, EpisodeCard).
- **Organisms**: Complex UI components (HeroBanner, Header, BottomNav).
- **Templates/Pages**: Page-level layouts.

**Tech Stack**: Next.js, React, Vanilla CSS (Premium Theme), TypeScript.
**Design Tokens**: Managed in `globals.css` (variables for colors, spacing, typography).

## Storage

**We use Supabase Storage** (S3-compatible) for all video content:

| Bucket | Access | Purpose |
|--------|--------|---------|
| `shortdrama-raw` | Private | Original uploaded videos |
| `shortdrama-processed` | Public | Processed videos, thumbnails, subtitles |

### Public URL Format
```
{SUPABASE_URL}/storage/v1/object/public/shortdrama-processed/{key}
```

## Environment Variables

### Required for Server & Worker

```bash
# Database
DATABASE_URL=postgresql://user:pass@host:5432/shortdrama

# JWT Secrets
JWT_SECRET=your-jwt-secret
ADMIN_JWT_SECRET=your-admin-jwt-secret

# Admin Credentials
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=your-admin-password

# Worker Authentication
WORKER_TOKEN=your-worker-token

# Supabase Storage (S3-compatible)
SUPABASE_URL=https://your-project.supabase.co
S3_ENDPOINT=https://your-project.supabase.co/storage/v1/s3
S3_REGION=us-east-1
S3_ACCESS_KEY=your-supabase-service-key
S3_SECRET_KEY=your-supabase-service-key
S3_BUCKET_RAW=shortdrama-raw
S3_BUCKET_PROCESSED=shortdrama-processed
PUBLIC_S3_BASE_URL=https://your-project.supabase.co/storage/v1/object/public
```

### Required for Viewer App

```bash
NEXT_PUBLIC_API_URL=https://your-api-server.com
```

## Development

### Server
```bash
cd server
npm install
npm run dev          # Start with hot-reload
npm run db:push      # Push Prisma schema to database
npm run prisma:studio # Open Prisma Studio for data inspection
```

### Worker
```bash
cd worker
pip install -r requirements.txt
python main.py       # Start processing jobs
```

### Viewer
```bash
cd viewer
npm install
npm run dev          # Start Next.js dev server
```

## Monetization Model

- **Free Episodes**: First N episodes per series are free (configurable)
- **Locked Episodes**: Require either:
  - **Watch Ad**: User watches a video ad → earns coins + unlocks episode
  - **Use Coins**: User spends coins to unlock episode

### Ad System
- Primary: Google AdSense video ads (when available)
- Fallback: Local mock ad served from `/content/raw/MockAd.mp4`

## Content Processing Flow

1. Admin uploads raw video to Supabase Storage
2. Creates series and triggers auto-split job
3. Worker claims job, downloads raw video
4. Splits into episodes (default 3 minutes each)
5. For each segment:
   - AI crop to vertical (9:16) with face tracking
   - Generate thumbnail
   - Generate placeholder subtitles
   - Upload to processed bucket
6. Episodes are published and available to viewers
