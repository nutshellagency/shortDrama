## ShortDrama — POC → MVP migration checklist (minimal hassle)

### 1) Auth: Guest → OTP (keep user state)
- Add OTP endpoints:
  - `POST /auth/login` (send OTP)
  - `POST /auth/verify-otp` (verify + issue token)
- Add **guest upgrade** endpoint:
  - `POST /auth/upgrade` (guest token + phone OTP verified) → merges/links accounts
- Data migration rules:
  - Preserve `user_episode_progress` and unlocks by moving/merging guest user_id → verified user_id
  - Resolve conflicts by “unlocked OR watched wins”
- App behavior:
  - Keep guest as default entry
  - Prompt OTP later (e.g., after N episodes or before purchase)

### 2) Ads: Mock rewarded → AdMob rewarded (provider-agnostic)
- Implement `RewardedAdProvider` interface in Flutter:
  - `load(adUnitId)`
  - `show()` → returns reward result
- AdMob provider implementation:
  - Wire reward callback → call `/episode/{id}/unlock` with method `ad`
- Backend hardening (MVP+):
  - Rate-limit unlock calls per user/device/IP
  - Log reward events: provider, adUnitId, deviceId/sessionId, timestamp
  - Add anomaly checks (unlock frequency, repeated failures)

### 3) Storage/CDN: Local MinIO → Cloudflare R2 + CDN
- Use S3-compatible client from day 1 (MinIO and R2 share API shape)
- Only config changes should be required:
  - `S3_ENDPOINT`, `S3_ACCESS_KEY`, `S3_SECRET_KEY`, `S3_BUCKET_RAW`, `S3_BUCKET_PROCESSED`
  - Public URL base (local vs CDN)
- CDN:
  - Put Cloudflare in front of processed bucket
  - Cache rules: MP4/JPG/SRT/JSON with long TTL (purge on overwrite/version change)
- Migration approach:
  - New uploads go to R2
  - Optionally backfill old assets later (not required for MVP launch)

### 4) Local → Cloud deploy (no re-architecture)
- Keep service boundaries identical:
  - `api` (NestJS monolith)
  - `worker` (python + ffmpeg)
  - `postgres`
  - `admin-web`
- Move from Compose to cloud:
  - Deploy API + worker as containers/VMs
  - Use managed Postgres if possible (or single VM at first)
  - Replace MinIO with R2

### 5) Quality gates before calling it “MVP”
- OTP login stable (retry handling, rate limits)
- AdMob rewarded stable (fill rate acceptable, unlock success rate high)
- Playback stable via CDN (no expired signed URLs during playback)
- AI jobs retry safely and admin can re-trigger without breaking assets


