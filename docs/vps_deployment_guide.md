# Deployment Guide: ShortDrama Backend on VPS

This guide explains how to deploy the ShortDrama API Server and AI Worker to your Linux VPS using Docker.

## Prerequisites
- Linux VPS (Ubuntu 22.04 recommended) with **Docker installed**.
- Git installed.

## 1. Quick Start (Run on VPS)

Login to your VPS and run:

```bash
# 1. Clone your repo (Assuming you pushed it to GitHub)
git clone https://github.com/YOUR_USERNAME/shortDrama.git
cd shortDrama

# 2. Create .env file
nano .env
# [Paste your environment variables here - see config/env.supabase for template]

# 3. Start everything
sudo docker compose -f docker-compose.prod.yml up -d --build
```

That's it! Your API is now running at `http://YOUR_VPS_IP`.

## 2. Connect Frontend (Vercel)

1. Go to Vercel Project Settings.
2. Set `NEXT_PUBLIC_API_URL` to `http://YOUR_VPS_IP` (No port needed, Nginx handles it).
3. Redeploy.

## Troubleshooting

- **Check logs:** `sudo docker compose -f docker-compose.prod.yml logs -f`
- **Restart:** `sudo docker compose -f docker-compose.prod.yml restart`
- **Update code:**
  ```bash
  git pull
  sudo docker compose -f docker-compose.prod.yml up -d --build
  ```
