# Brainstorm Report: Avatar Upload Feature

## Problem
Add avatar upload and display across the badminton match tracker app.

## Requirements
- User can update avatar via Settings page
- Player avatars for each player record
- Camera/gallery selection (mobile web)
- Client-side compression to 200x200
- Reusable Avatar component with name-initial fallback
- Use Avatar component everywhere (PodiumChart, PlayerSelector, PlayersPage, Settings)

## Evaluated Approaches

### A: Supabase Storage + Public URLs (Recommended)
Upload compressed image to Supabase Storage bucket. Store public URL in DB.
- CDN caching, fast delivery
- Keeps DB lean (just URL string)
- Works with existing `avatar_url` field
- Scales well

### B: Base64 in Database
- No bucket needed but bloats rows (~15-30KB each)
- Slower queries, no CDN
- Rejected

### C: External Image Service (Cloudinary)
- Overkill for this app
- Extra dependency and cost
- Rejected

## Decision: Option A (Supabase Storage)

## Key Design
- Storage path: `avatars/{entity}/{id}.jpg`
- Compression: canvas center-crop to square, 200x200, JPEG 0.85 (~8-15KB)
- Camera: HTML5 `<input capture>` triggers native OS picker (no explicit permission)
- User avatars: new `profiles` table
- Player avatars: existing `players.avatar_url` field
