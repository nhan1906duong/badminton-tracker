# Deployment Guide

## Prerequisites

- Node.js 18+
- npm
- Supabase account
- Vercel account (for hosting)

---

## Local Environment

Create `.env` in project root:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

For development, also create `.env.dev` with the same variables.

---

## Supabase Setup (New Project)

### 1. Create Project

Go to [supabase.com](https://supabase.com) and create a new project.

### 2. Get Credentials

Project Settings → API:
- **Project URL** → `VITE_SUPABASE_URL`
- **anon public key** → `VITE_SUPABASE_ANON_KEY`

### 3. Run Migrations

In Supabase Dashboard → SQL Editor, run every file in `supabase/migrations/` in numeric order (`001_...` through `012_...`). The later migrations add BWF tournament metadata, ranking fields, match lifecycle state, roles, user-player linking, profile auto-creation, and authenticated session/match edit policies.

### 4. Create Storage Bucket (Avatars)

Avatars are uploaded to Supabase Storage.

1. Supabase Dashboard → Storage → **New bucket**
2. Name: `avatars`
3. Toggle **Public bucket** ON
4. Click Save

### 5. Storage Policies

Run in SQL Editor:

```sql
-- Enable RLS on storage.objects
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to upload avatars
CREATE POLICY "avatars_upload_auth"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'avatars');

-- Allow authenticated users to read any avatar
CREATE POLICY "avatars_select_auth"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'avatars');

-- Allow authenticated users to update (overwrite) avatars
CREATE POLICY "avatars_update_auth"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'avatars')
  WITH CHECK (bucket_id = 'avatars');

-- Allow authenticated users to delete avatars
CREATE POLICY "avatars_delete_auth"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'avatars');
```

### 6. Auth Settings

The app uses Supabase email + password sign-in.

1. Authentication → Providers → Email
2. Ensure **Confirm email** is enabled
3. Set Site URL to your production domain (e.g., `https://badminton-tracker.vercel.app`)
4. Add your Vercel preview domains to Redirect URLs if needed

---

## Vercel Deploy

### Option A: Vercel CLI

```bash
# Install CLI
npm i -g vercel

# Login
vercel login

# Deploy (follow prompts, link to existing project or create new)
vercel

# Deploy to production
vercel --prod
```

### Option B: Git Integration (Recommended)

1. Push code to GitHub
2. Go to [vercel.com/new](https://vercel.com/new)
3. Import your repo
4. Vercel auto-detects Vite — confirm settings:
   - Framework Preset: **Vite**
   - Build Command: `npm run build`
   - Output Directory: `dist`
5. Add Environment Variables:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
6. Deploy

### Environment Variables in Vercel

Vercel Dashboard → Project → Settings → Environment Variables:

| Variable | Value |
|----------|-------|
| `VITE_SUPABASE_URL` | Your Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Your Supabase anon key |

Make sure to set them for **Production**, **Preview**, and **Development** environments.

### Disable Deployment Protection

By default Vercel may require login. To make the site public:

Vercel Dashboard → Project → Settings → Deployment Protection → **Disable** "Vercel Authentication"

---

## SPA Routing

The project includes `vercel.json` for client-side routing:

```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

This ensures direct URL access (e.g., `/sessions/123`) works without 404s.

---

## Build Locally

```bash
# Install dependencies
npm install

# Dev server
npm run dev

# Production build
npm run build

# Preview production build
npm run preview
```

---

## PWA Installation

1. Deploy the app
2. Open in mobile browser
3. Tap "Add to Home Screen" / "Install"

Requires HTTPS and a valid manifest (handled by `vite-plugin-pwa`).

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Avatar upload fails | Check Storage bucket `avatars` is public and policies are set |
| 404 on page refresh | Ensure `vercel.json` has SPA rewrite rules |
| "Log in to Vercel" screen | Disable Deployment Protection in Vercel settings |
| Supabase connection failed | Verify env vars are correct in Vercel |
| Login fails | Verify the user exists, email confirmation settings, and Auth Site URL match your domain |
| Build failed | Run `npm run lint` to check errors |
| CORS errors on storage | Ensure bucket is public and policies allow authenticated access |
