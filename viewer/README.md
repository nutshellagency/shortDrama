# ShortDrama Viewer

A standalone Next.js viewer app for the ShortDrama platform. Deploys to Vercel and connects to your ShortDrama API backend.

## Getting Started

### Prerequisites
- Node.js 18+
- The ShortDrama API server running (locally or deployed)

### Installation

```bash
cd viewer
npm install
```

### Configuration

Copy the example environment file and configure:

```bash
cp .env.local.example .env.local
```

Edit `.env.local` to point to your API:
- Local development: `NEXT_PUBLIC_API_URL=http://localhost:3000`
- Production: `NEXT_PUBLIC_API_URL=https://your-api-domain.com`

### Development

```bash
npm run dev
```

Open [http://localhost:3001](http://localhost:3001) in your browser.

### Build

```bash
npm run build
```

### Deploy to Vercel

1. Push this directory to a Git repository
2. Import the project in Vercel
3. Set the environment variable `NEXT_PUBLIC_API_URL` to your production API URL
4. Deploy!

## Features

- 🏠 **Home Feed**: Hero banner and horizontal episode rails
- 🎬 **Video Player**: Full-screen playback with custom controls
- 🔓 **Unlock System**: Watch ads or spend coins to unlock locked episodes
- 🔍 **Explore**: Browse all series in a grid layout
- 💰 **Coin System**: Track and spend coins for premium content

## Project Structure

```
viewer/
├── app/                  # Next.js App Router pages
│   ├── page.tsx          # Home page
│   ├── explore/page.tsx  # Explore page
│   └── player/[episodeId]/page.tsx  # Video player
├── components/           # React components
├── lib/                  # Utilities, API client, auth context
└── public/               # Static assets
```
