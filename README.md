## ShortDrama (Local POC)

This repo contains a **local-first proof of concept** for the ShortDrama platform:
- **API** (Node.js + Postgres)
- **AI Worker** (Python + FFmpeg)
- **Object storage** (MinIO; S3-compatible)
- Minimal **viewer** + **admin** web pages served by the API (so we can validate end-to-end before Flutter).

### Prerequisites
- Docker Desktop

### Quick start (local)
1) Copy environment variables:
- Use `config/env.example` as reference and export them in your shell, or paste them into your Docker environment.

2) Start everything:

```bash
docker compose up --build
```

3) Open:
- Viewer: `http://localhost:3000/app`
- Admin: `http://localhost:3000/admin`
- MinIO Console: `http://localhost:9001` (user/pass: `minioadmin` / `minioadmin` by default)

### Admin credentials (dev defaults)
- Email: `admin@local`
- Password: `admin`

### What “done” looks like (POC)
- Admin uploads a raw video and triggers AI processing.
- Worker produces:
  - vertical MP4
  - thumbnail JPG
  - subtitles SRT (dummy for POC)
  - metadata JSON
- Admin publishes the episode.
- Viewer can play it and test unlock + progress.


