# Deploying ShortDrama Viewer to Vercel

## Prerequisites

Before deploying, you need:
1. A **GitHub account** (or GitLab/Bitbucket)
2. A **Vercel account** (free tier works fine) - [Sign up at vercel.com](https://vercel.com)
3. Your ShortDrama project pushed to a Git repository

---

## Step 1: Push Your Code to GitHub

If you haven't already, push your project to GitHub:

```bash
# Navigate to your project root
cd d:\Projects\shortDrama

# Initialize git if needed
git init

# Add all files
git add .

# Commit
git commit -m "Add standalone viewer app"

# Add your GitHub remote (replace with your repo URL)
git remote add origin https://github.com/YOUR_USERNAME/shortDrama.git

# Push
git push -u origin main
```

---

## Step 2: Import Project in Vercel

1. Go to [vercel.com/dashboard](https://vercel.com/dashboard)
2. Click **"Add New..."** → **"Project"**
3. Click **"Import Git Repository"**
4. Select your `shortDrama` repository
5. **IMPORTANT**: Configure the project settings:

### Root Directory Setting
Since the viewer is in a subdirectory, you must set:
- **Root Directory**: `viewer`

Click "Edit" next to Root Directory and type `viewer`

### Framework Preset
Vercel should auto-detect **Next.js** - verify this is selected.

---

## Step 3: Configure Environment Variables

Before deploying, add the environment variable:

1. Expand **"Environment Variables"** section
2. Add:
   - **Name**: `NEXT_PUBLIC_API_URL`
   - **Value**: Your API URL (see options below)

### API URL Options

**Option A: Use your local server (for testing only)**
This won't work on Vercel since localhost isn't accessible. Use Option B or C.

**Option B: Use a tunneling service temporarily**
Use [ngrok](https://ngrok.com) or [localhost.run](https://localhost.run) to expose your local server:
```bash
# In your server directory
ssh -R 80:localhost:3000 nokey@localhost.run
```
This gives you a public URL like `https://abc123.lhr.life` - use this as your API URL.

**Option C: Deploy your server first (recommended for production)**
Deploy your Fastify server to Vercel, Railway, or Render (see separate guide below).

---

## Step 4: Deploy

1. Click **"Deploy"**
2. Wait 1-2 minutes for the build
3. Once complete, you'll get a URL like `https://shortdrama-viewer.vercel.app`

---

## Step 5: Test Your Deployment

1. Open your Vercel URL
2. You should see the ShortDrama home page
3. If you see errors, check:
   - Browser DevTools Console for API errors
   - Vercel deployment logs for build errors

---

## Quick Test: Deploy with Mock/Demo Mode

If you just want to see the frontend without a backend, you can temporarily test with a placeholder. The app will show loading states and API errors, but you'll verify the deployment works.

---

## Troubleshooting

### "Failed to fetch" or CORS errors
Your API server needs CORS enabled for the Vercel domain. The existing server has `cors: { origin: true }` which allows all origins.

### Build fails
Check the Vercel build logs. Common issues:
- Missing dependencies: Run `npm install` locally and commit `package-lock.json`
- TypeScript errors: Fix any type errors locally first

### Blank page
- Check browser console for JavaScript errors
- Verify `NEXT_PUBLIC_API_URL` is set correctly

---

## Deploying Your API Server (Option C Details)

To deploy your Fastify API to Vercel:

### 1. Create a Vercel serverless function wrapper

Create `server/api/index.ts`:
```typescript
import { app } from '../src/index';
export default async (req, res) => {
  await app.ready();
  app.server.emit('request', req, res);
};
```

### 2. Create `server/vercel.json`:
```json
{
  "builds": [{ "src": "api/index.ts", "use": "@vercel/node" }],
  "routes": [{ "src": "/(.*)", "dest": "api/index.ts" }]
}
```

### 3. Set environment variables in Vercel:
- `DATABASE_URL` - Your Supabase connection string
- `JWT_SECRET`, `ADMIN_JWT_SECRET`
- `S3_ENDPOINT`, `S3_ACCESS_KEY`, `S3_SECRET_KEY`, etc.

**Alternative**: Use [Railway](https://railway.app) or [Render](https://render.com) which are simpler for Node.js APIs.

---

## Summary Checklist

- [ ] Push code to GitHub
- [ ] Import project in Vercel
- [ ] Set Root Directory to `viewer`
- [ ] Add `NEXT_PUBLIC_API_URL` environment variable
- [ ] Deploy
- [ ] Test the live URL
