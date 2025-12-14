## ShortDrama — Backlog & Tracker (POC → MVP)

### How to use this tracker
- Treat each **Milestone** as a shippable increment with clear acceptance criteria.
- Each **Epic** contains concrete tasks; promote tasks into GitHub Issues as needed.
- Keep POC “cloud-shaped” locally to avoid rework during migration.

---

## Milestone M0 — UX/Prototype (no backend dependency)
### Goal
Validate the swipe/binge UX and admin upload UX with mock data.

### Epics & tasks
- **Mobile: Viewer UX prototype**
  - Build swipe feed UI (PageView-style)
  - Build player UI shell (play/pause, subtitle toggle, next episode CTA)
  - Build locked overlay + unlock modal (coins + watch ad)
  - Add placeholder wallet balance surface
- **Admin: UX prototype**
  - Series list + create form (mock)
  - Episode upload wizard (mock)
  - AI job monitor table (mock)

### Acceptance criteria
- Viewer can swipe through mocked episodes and see locked/unlocked states.
- Admin can navigate the full upload wizard flow (mocked).

---

## Milestone M1 — Local POC (end-to-end working)
### Goal
Full loop works locally: admin uploads + triggers AI → viewer watches/unlocks/progress.

### Epic A — Local infra (Docker Compose)
- Add `docker-compose.yml` with:
  - Postgres
  - API (NestJS)
  - Admin web
  - MinIO (S3-compatible)
  - Worker (python + ffmpeg)
- Add `.env.example` with all required variables
- Document “one command up” in `README`

### Epic B — Database (migrations)
- Add tables (minimum):
  - `ai_jobs`
  - `media_assets`
  - `transactions`
- Add constraints/indexes:
  - `episodes(series_id, episode_number)` unique
  - `user_episode_progress(user_id, episode_id)` unique

### Epic C — Backend (NestJS monolith)
- **Auth**
  - `POST /auth/guest` returns JWT/session + creates user record if needed
- **Feed/Content**
  - `GET /feed/home`
  - `GET /series/{id}`
  - `GET /series/{id}/episodes`
- **Unlock**
  - `POST /episode/{id}/unlock` method=coins|ad
  - Coins: deduct + transaction log
  - Ad (POC): accept and log `ad_unlock` transaction (client-trusted)
- **Progress**
  - `POST /episode/{id}/progress` watched=true
- **Admin**
  - Admin auth (email/password)
  - Create/update series
  - Upload raw (presigned URL recommended)
  - Trigger AI job (`/admin/trigger-ai`)
  - Publish episode (`/admin/episodes/{id}/publish`)
- **AI integration**
  - Worker claims jobs (polling endpoint or DB-driven claim)
  - Worker callback: `POST /ai/jobs/{id}/complete`

### Epic D — Storage abstraction
- Implement “storage client” interface:
  - Put object
  - Get signed URL (upload/download)
  - Resolve public URL (for playback)
- Configure MinIO locally behind same interface.

### Epic E — Worker (python + ffmpeg)
- Job loop:
  - claim pending job
  - mark Processing
  - produce outputs: MP4/JPG/SRT/JSON
  - upload outputs
  - callback backend completion
  - mark Ready
- Failure handling:
  - attempts counter
  - error field
  - retryable failures

### Epic F — Mobile (Flutter, real API)
- Guest login call on first launch
- Feed consumption + swipe playback
- Unlock:
  - Coins unlock works end-to-end
  - Mock “watch ad” triggers unlock method=ad
- Progress marking

### Acceptance criteria
- Admin uploads a raw video and triggers AI.
- Worker processes the job and produces playable assets.
- Admin publishes the episode and it appears in the feed.
- Viewer watches episode 1, unlocks episode 2, progress persists across restart.

---

## Milestone M1.1 — Real AdMob rewarded (still local OK)
### Goal
Replace mock ad flow with real rewarded ads (AdMob).

### Epics & tasks
- **Mobile**
  - AdMob rewarded integration
  - Provider interface (future extensibility)
  - On reward callback → call unlock method=ad
- **Backend**
  - Rate limit unlock calls per user/device
  - Log ad unlock metadata (provider, ad_unit, timestamp)
  - Basic anomaly counters (too many unlocks per minute, etc.)

### Acceptance criteria
- A real rewarded ad unlocks a locked episode reliably.

---

## Milestone M2 — Cloud migration (minimal changes)
### Goal
Move from local infra to cloud with config changes, not rewrites.

### Epics & tasks
- **Storage**
  - MinIO → Cloudflare R2 (S3-compatible)
  - Ensure URLs resolve correctly for playback
- **Delivery**
  - Cloudflare CDN caching rules for video + assets
- **Deploy**
  - Backend deploy (VM/container)
  - Worker deploy (VM/container)
  - Admin web deploy (static hosting)
- **Ops**
  - Basic logs + health checks

### Acceptance criteria
- Same end-to-end flow works in cloud with stable playback URLs.

---

## Milestone M3 — MVP hardening (OTP + polish)
### Goal
Introduce OTP auth and polish reliability/perf for early users.

### Epics & tasks
- **Auth**
  - Add OTP endpoints + provider
  - Guest-to-account upgrade path (retain progress/unlocks)
- **Performance**
  - Feed caching (optional), CDN tuning, preloading in app
- **AI quality**
  - Better smart-crop rules
  - Optional scene splitting (1–3 min chunks)

### Acceptance criteria
- Users can authenticate via OTP and keep their watch history from guest mode.


