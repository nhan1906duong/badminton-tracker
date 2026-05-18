# Avatar Upload Implementation Plan

## Overview
Add avatar upload (camera/gallery) with client-side compression, reusable Avatar component, and integration across the app.

## Status
- [ ] Phase 01: Supabase Infrastructure
- [ ] Phase 02: Core Components & Utilities
- [ ] Phase 03: App Integration

## Key Dependencies
- Supabase Storage bucket (`avatars`)
- Supabase `profiles` table
- Canvas API for image compression

## Files

### Create
- `src/components/Avatar.tsx`
- `src/components/AvatarPicker.tsx`
- `src/hooks/useAvatarUpload.ts`
- `src/lib/image.ts`

### Modify
- `src/pages/SettingsPage.tsx`
- `src/pages/PlayersPage.tsx`
- `src/components/PlayerSelector.tsx`
- `src/components/PodiumChart.tsx`
- `src/types/database.ts`

## Phases

| Phase | File | Description |
|-------|------|-------------|
| 01 | [phase-01-supabase-infra.md](./phase-01-supabase-infra.md) | Create Storage bucket, profiles table, RLS policies |
| 02 | [phase-02-core-components.md](./phase-02-core-components.md) | Avatar component, AvatarPicker, image compression, upload hook |
| 03 | [phase-03-app-integration.md](./phase-03-app-integration.md) | Integrate into SettingsPage, PlayersPage, PlayerSelector, PodiumChart |

## Success Criteria
- [ ] Tap avatar in Settings → choose camera/gallery → new avatar shows
- [ ] Player list shows avatars with name-initial fallback
- [ ] PlayerSelector shows avatars instead of generic User icon
- [ ] PodiumChart displays player avatars
- [ ] Images compressed to ≤20KB before upload
- [ ] Works on iOS Safari and Android Chrome
