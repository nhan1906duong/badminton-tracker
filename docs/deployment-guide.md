# Deployment Guide

## Prerequisites

- Node.js 18+
- npm or pnpm
- Supabase account with project

## Environment Setup

1. Create `.env` file in project root:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

2. For development, create `.env.dev` with same variables

## Development

```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Access at http://localhost:5173
```

## Build

```bash
# Production build
npm run build

# Preview production build
npm run preview
```

## Supabase Setup

### 1. Create Project

Go to [supabase.com](https://supabase.com) and create a new project.

### 2. Get Credentials

Find in Settings → API:
- Project URL → `VITE_SUPABASE_URL`
- anon public key → `VITE_SUPABASE_ANON_KEY`

### 3. Run SQL Schema

Execute in Supabase SQL Editor:

```sql
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Players table
CREATE TABLE players (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  email TEXT,
  avatar_url TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Matches table
CREATE TABLE matches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  match_type TEXT NOT NULL,
  played_at TIMESTAMPTZ DEFAULT now(),
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Match teams
CREATE TABLE match_teams (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  match_id UUID REFERENCES matches(id) ON DELETE CASCADE,
  team_label TEXT NOT NULL,
  is_winner BOOLEAN DEFAULT false
);

-- Match participants
CREATE TABLE match_participants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  match_id UUID REFERENCES matches(id) ON DELETE CASCADE,
  team_id UUID REFERENCES match_teams(id) ON DELETE CASCADE,
  player_id UUID REFERENCES players(id) ON DELETE CASCADE
);

-- Match scores
CREATE TABLE match_scores (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  match_id UUID REFERENCES matches(id) ON DELETE CASCADE,
  set_number INTEGER NOT NULL,
  team_a_score INTEGER NOT NULL,
  team_b_score INTEGER NOT NULL
);

-- RLS Policies (enable row-level security)
ALTER TABLE players ENABLE ROW LEVEL SECURITY;
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE match_teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE match_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE match_scores ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users full access
CREATE POLICY "Users can CRUD own data" ON players FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Users can CRUD own data" ON matches FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Users can CRUD own data" ON match_teams FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Users can CRUD own data" ON match_participants FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Users can CRUD own data" ON match_scores FOR ALL USING (auth.role() = 'authenticated');
```

## Deploy

### Vercel

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Set env vars in Vercel dashboard
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
```

### Netlify

```bash
# Install Netlify CLI
npm i -g netlify-cli

# Deploy
netlify deploy --prod

# Set env vars in Netlify dashboard
```

## PWA Installation

1. Build the app: `npm run build`
2. Deploy `dist/` folder to any static host
3. Open in mobile browser → "Add to Home Screen"

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Supabase connection failed | Verify env vars are correct |
| OTP not received | Check spam folder |
| PWA not installing | Ensure HTTPS and valid manifest |
| Build failed | Run `npm run lint` to check errors |