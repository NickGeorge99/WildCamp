# WildCamp

A free dispersed camping finder. Discover public lands (BLM, USFS, NPS, State) and share camp spots with the community.

## Tech Stack

- React + Vite
- MapLibre GL JS with OpenFreeMap tiles
- PMTiles for PAD-US public lands overlay
- Supabase for user-submitted spots
- Tailwind CSS

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Set up Supabase (optional)

The app works in demo mode without Supabase — spots are stored in memory only.

To persist spots:

1. Create a free project at [supabase.com](https://supabase.com)
2. Run the SQL in `supabase/schema.sql` in your Supabase SQL Editor
3. Copy `.env.example` to `.env` and fill in your credentials:

```bash
cp .env.example .env
```

```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

You can find these in your Supabase dashboard under **Settings > API**.

### 3. Run the dev server

```bash
npm run dev
```

## Features

- Full-screen interactive map centered on the western US
- PAD-US public lands overlay color-coded by manager (BLM, USFS, NPS, State)
- Toggle layers on/off
- Search for locations (powered by Nominatim/OpenStreetMap)
- Add dispersed camping spots by clicking the map
- View spot details in popups
- No login required

## Map Layers

| Color | Manager |
|-------|---------|
| Yellow | BLM |
| Green | USFS |
| Light Green | NPS |
| Brown | State |
| Orange dot | User-submitted camp spot |
