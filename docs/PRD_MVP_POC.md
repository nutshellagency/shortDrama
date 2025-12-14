## ShortDrama — PRD v1.1 (POC-first)

### 1) Executive summary
ShortDrama is a mobile-first OTT app focused on **short-form episodic vertical dramas (9:16)** for **India + Pakistan**, primarily **Hindi/Urdu**, with **1–3 minute** bingeable episodes. The core loop is **Swipe → Watch → Unlock → Binge**.

This PRD locks the **POC scope** first (guest mode + mock monetization), then defines the clean migration path to **MVP** (OTP auth + AdMob rewarded + cloud storage/CDN).

### 2) Goals
- **POC goal**: Validate the end-to-end product loop and content pipeline:
  - Viewer can **browse → watch → unlock → progress saved**
  - Admin can **upload raw → trigger AI job → publish**
  - AI worker can **produce playable assets** (MP4 + thumbnail + SRT + metadata JSON)
- **MVP goal**: Productionize the same experience with **OTP auth**, **AdMob rewarded unlock**, and **cloud delivery**.

### 3) Non-goals (POC)
- Creator self-serve onboarding/payouts
- Subscriptions
- Microservices architecture
- “Perfect” rewarded-ad server verification (we will harden in phases)
- Full analytics suite (basic event logging only)

### 4) Personas
- **Viewer (16–35, mobile-first)**: wants fast, emotional, bingeable stories in Hindi/Urdu.
- **Admin/Content Manager**: uploads and manages series/episodes, monitors AI jobs, sets lock/price.
- **Creator/Studio (phase 2)**: uploads and publishes content, earnings, analytics.

### 5) Product scope

#### 5.1 POC (Guest mode)
**Must-have**
- Guest mode (no OTP; create anonymous user server-side).
- Feed: swipe-first viewing of episodes.
- Player: vertical playback, subtitle toggle, next episode.
- Unlock: coins + “mock rewarded ad” (UI simulates success).
- Progress tracking (watched/unlocked).
- Admin web: create series, upload raw episode, trigger AI, monitor jobs, publish.
- AI worker: generate vertical MP4 + thumbnail + SRT + metadata JSON.

**Nice-to-have (POC)**
- Language selection (Hindi/Urdu) stored on guest profile
- Basic featured rails (e.g., “Trending”, “New”)

#### 5.2 MVP (Post-POC)
- OTP auth (phone + verify OTP).
- AdMob rewarded unlock in-app.
- Cloudflare R2 + CDN-backed delivery.
- Stronger anti-fraud posture (rate limiting + logging + anomaly checks + optional device attestation).

### 6) UX requirements (POC)

#### Mobile (Flutter)
- **Home feed**: full-screen vertical swipe; minimal chrome.
- **Player**: play/pause, subtitle toggle, series/episode title overlay, auto-advance.
- **Locked episode overlay**:
  - CTA1: “Watch Ad to Unlock” (mock in POC; AdMob in MVP)
  - CTA2: “Unlock with Coins”
- **Wallet**: show coin balance in unlock context.

#### Admin web
- **Auth**: email/password + role-based access (Admin, Editor).
- **Series management**: create/list/edit.
- **Episode upload wizard**: select series → upload raw → lock settings → trigger AI.
- **AI job monitor**: status list, retries, error logs.
- **Publish control**: publish/unpublish episode.

### 7) API (POC + MVP)
Baseline contracts from `docs/API Contracts.txt`:
- Auth:
  - `POST /auth/login` (MVP)
  - `POST /auth/verify-otp` (MVP)
- Feed:
  - `GET /feed/home`
- Series:
  - `GET /series/{id}`
  - `GET /series/{id}/episodes`
- Episode:
  - `POST /episode/{id}/unlock` body `{ method: "ad" | "coins" }`
  - `POST /episode/{id}/progress` body `{ watched: true }`
- Admin:
  - `POST /admin/upload`
  - `POST /admin/trigger-ai`

POC-required additions (to support AI job completion + publishing cleanly):
- `POST /auth/guest` (create/return guest session)
- `POST /ai/jobs/{id}/complete` (worker callback with output URLs + metadata)
- `POST /admin/episodes/{id}/publish` (publish toggle)

### 8) Data model (POC)
Baseline from `docs/DatabaseSchema.txt`:
- `users`, `series`, `episodes`, `user_episode_progress`

POC adds (minimal but necessary for real ops):
- `ai_jobs`: id, episode_id, raw_asset_id, status, attempts, error, created_at, updated_at
- `media_assets`: id, kind(raw|video|thumb|subtitles|metadata), storage_key/url, created_at
- `transactions`: id, user_id, episode_id, type(ad_unlock|coin_spend|coin_grant), amount, created_at

### 9) AI worker requirements (POC)
Inputs and goals per:
- `docs/aiworkerPrompt.txt`
- `docs/SmartCropPrompt.txt`
- `docs/Subtitle&MetaDataPrompt.txt`
- `docs/FinalOutputJsonPrompt.txt`

**Output artifacts (required)**
- Vertical 9:16 MP4
- Thumbnail JPG
- Subtitle SRT
- Metadata JSON:

```json
{
  "episode_title": "string (<= 6 words)",
  "duration": "mm:ss",
  "language": "hi|ur",
  "thumbnail": "thumb_url",
  "video": "cdn_video_url",
  "subtitles": "srt_url"
}
```

**POC processing strategy**
- Prioritize reliability over perfection:
  - Crop strategy that avoids cutting faces when possible
  - Generate a usable thumbnail
  - Generate basic subtitles (can be placeholder for POC if needed)
  - Always produce metadata JSON even if subtitles are missing (flag it)

### 10) Architecture (local-first, cloud-shaped)
From `docs/Short Drama Platform – Architecture, Admin Ux & Creator Flow.extracted.txt`:
- Flutter app → API gateway → NestJS monolith → Postgres → object storage → CDN
- AI worker as decoupled component

**POC local**
- Docker Compose: `postgres`, `api`, `admin-web`, `minio` (S3-compatible), `worker`

**MVP cloud**
- Storage: Cloudflare R2 (S3-compatible)
- Delivery: Cloudflare CDN
- Backend + worker: single VM/container each (scale later)

### 11) Success criteria
POC is “done” when:
- Admin can upload raw content, trigger AI, see job status, publish an episode.
- Viewer can swipe feed, watch episode 1, unlock episode 2 (coins/mock ad), and progress persists.
- All artifacts (mp4/jpg/srt/json) are reachable via URLs and playable in the app.

### 12) Risks & mitigations (POC → MVP)
- Rewarded ad fraud: mitigate with logging + rate limiting + anomaly detection; harden in MVP+.
- Video processing variability: start with a safe crop pipeline; iterate with smart-crop + scene splitting later.
- Storage migration: use S3-compatible API from day 1 (MinIO → R2 config-only switch).


