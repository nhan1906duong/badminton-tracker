# Environment Setup

Guide for creating a new environment (e.g., production, staging) from scratch.

---

## 1. Create Supabase Project

1. Go to [supabase.com](https://supabase.com/dashboard)
2. New Project → select organization
3. Enter project name (e.g., `badminton-tracker-prod`)
4. Choose region closest to your users
5. Set database password (save it securely)
6. Wait for project to provision

---

## 2. Run Database Migrations

In Supabase Dashboard → SQL Editor → New query:

**Run `001_initial_schema.sql`:**

```sql
-- copy contents of supabase/migrations/001_initial_schema.sql
-- and paste into SQL Editor, then Run
```

**Run `002_sessions.sql`:**

```sql
-- copy contents of supabase/migrations/002_sessions.sql
-- and paste into SQL Editor, then Run
```

---

## 3. Setup Storage (Avatars)

1. Storage → New bucket
2. Name: `avatars`
3. Toggle **Public bucket** ON
4. Save

Run storage policies in SQL Editor:

```sql
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "avatars_upload_auth"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'avatars');

CREATE POLICY "avatars_select_auth"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'avatars');

CREATE POLICY "avatars_update_auth"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'avatars')
  WITH CHECK (bucket_id = 'avatars');

CREATE POLICY "avatars_delete_auth"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'avatars');
```

---

## 4. Configure Auth

Authentication → URL Configuration:

| Setting | Value |
|---------|-------|
| Site URL | `https://your-domain.vercel.app` |
| Redirect URLs | `https://your-domain.vercel.app/**` |

Authentication → Providers → Email:
- Confirm email: **Enabled**
- Secure email change: **Enabled** (optional)

---

## 5. Get Environment Variables

Project Settings → API:

| Variable | Where to find |
|----------|---------------|
| `VITE_SUPABASE_URL` | Project URL (e.g., `https://xxxxx.supabase.co`) |
| `VITE_SUPABASE_ANON_KEY` | `anon public` key |

---

## 6. Deploy to Vercel

### Add Environment Variables

Vercel Dashboard → Project → Settings → Environment Variables:

Add both variables for **Production**, **Preview**, and **Development**:

```
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
```

### Deploy

Push to GitHub → Vercel auto-deploys.

Or deploy manually:

```bash
vercel --prod
```

### Disable Deployment Protection

Settings → Deployment Protection → **Disable** Vercel Authentication.

---

## 7. Verify

| Check | How |
|-------|-----|
| Site loads | Open production URL |
| Login works | Send OTP, check email |
| Create player | Add a player in the app |
| Upload avatar | Pick a photo for a player |
| Create session | Start a new session |
| Create match | Add a match with scores |

---

## Environment Checklist

- [ ] Supabase project created
- [ ] Migrations 001 and 002 run
- [ ] Storage bucket `avatars` created (public)
- [ ] Storage policies applied
- [ ] Auth Site URL configured
- [ ] Vercel env vars set
- [ ] Deployment protection disabled
- [ ] Smoke test passed
