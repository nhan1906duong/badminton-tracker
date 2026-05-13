# Phase 9 — Deploy

## Overview
- **Priority**: P0
- **Status**: Pending
- **Description**: Deploy the app to Vercel and configure production environment.

## Steps

### 1. Vercel Setup
```bash
npm install -g vercel
vercel login
vercel --prod
```

### 2. Environment Variables
In Vercel dashboard → Project Settings → Environment Variables:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

### 3. Build Configuration
`vercel.json` (if needed):
```json
{
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
}
```

### 4. Supabase CORS
Add Vercel production domain to Supabase CORS allowed origins.

### 5. Custom Domain (Optional)
- Buy domain (e.g., badminton-tracker.vercel.app or custom)
- Configure in Vercel → Domains
- Update Supabase CORS

### 6. Post-Deploy Checks
- [ ] App loads at production URL
- [ ] Auth works (OTP emails sent)
- [ ] Can create players
- [ ] Can create matches
- [ ] PWA installable on iOS
- [ ] All features work on mobile

## Files to Create
- `vercel.json`

## Success Criteria
- [ ] Live at production URL
- [ ] All features functional
- [ ] iOS PWA installable
- [ ] Supabase connection secure

## Done!
