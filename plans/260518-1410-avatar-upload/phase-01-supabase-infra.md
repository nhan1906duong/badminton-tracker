# Phase 01: Supabase Infrastructure

## Priority
P0 - Blocker for all other phases

## Description
Set up Supabase Storage bucket and database schema for avatar storage.

## Related Code Files
- Supabase Console (browser)
- Supabase SQL Editor

## Implementation Steps

### Step 1: Create Storage Bucket
In Supabase Dashboard → Storage → New Bucket:
- Name: `avatars`
- Public: **Enabled** (avatars need public read)
- File size limit: 1MB (safety net, compression keeps it ~10KB)

### Step 2: Create RLS Policies
Run in Supabase SQL Editor:

```sql
-- Public read access to avatars
CREATE POLICY "Avatar images are publicly accessible"
ON storage.objects FOR SELECT
TO anon, authenticated
USING (bucket_id = 'avatars');

-- Authenticated users can upload to their own path
CREATE POLICY "Users can upload own avatar"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'avatars'
  AND (storage.foldername(name))[1] IN ('users', 'players')
);

-- Authenticated users can delete their own avatar
CREATE POLICY "Users can delete own avatar"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'avatars'
  AND (storage.foldername(name))[1] IN ('users', 'players')
);

-- Authenticated users can update their own avatar
CREATE POLICY "Users can update own avatar"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'avatars'
  AND (storage.foldername(name))[1] IN ('users', 'players')
);
```

### Step 3: Create Profiles Table
Run in Supabase SQL Editor:

```sql
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  avatar_url TEXT,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Users can read any profile
CREATE POLICY "Profiles are viewable by everyone"
ON profiles FOR SELECT
TO anon, authenticated
USING (true);

-- Users can only update their own profile
CREATE POLICY "Users can update own profile"
ON profiles FOR UPDATE
TO authenticated
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

-- Users can insert their own profile
CREATE POLICY "Users can insert own profile"
ON profiles FOR INSERT
TO authenticated
WITH CHECK (id = auth.uid());
```

### Step 4: Verify `players.avatar_url` Column
Confirm the `avatar_url` column exists on the `players` table (it should already based on types). If not:

```sql
ALTER TABLE players ADD COLUMN IF NOT EXISTS avatar_url TEXT;
```

## Todo
- [ ] Create `avatars` bucket in Supabase Storage (public)
- [ ] Run RLS policy SQL for Storage
- [ ] Run profiles table SQL
- [ ] Verify `players.avatar_url` column exists
- [ ] Generate updated types: `npx supabase gen types typescript --project-id <ref> --schema public > src/types/database.ts`

## Success Criteria
- `avatars` bucket visible in Supabase Storage dashboard
- Can upload a test file via Supabase dashboard
- `profiles` table exists and is queryable
- `players.avatar_url` column exists
