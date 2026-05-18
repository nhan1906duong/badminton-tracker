---
status: completed
created: 2026-05-18
completed: 2026-05-18
type: feature
---

# Plan: Default Avatar Selection & Storage Cleanup

## Overview

Add a grid of 10 default multiavatar options to the AvatarPicker and implement automatic cleanup of old uploaded photos from Supabase Storage.

**Brainstorm report:** [brainstorm-260518-1607-avatar-default-selection-and-cleanup.md](../reports/brainstorm-260518-1607-avatar-default-selection-and-cleanup.md)

## Phases

| # | Phase | Status | File |
|---|---|---|---|
| 1 | Hooks | completed | [phase-01-hooks.md](phase-01-hooks.md) |
| 2 | UI & Integration | completed | [phase-02-ui-and-integration.md](phase-02-ui-and-integration.md) |

## Key Decisions

- Default avatars stored as external URLs in DB (no storage upload)
- Deterministic fallback kept for `avatar_url = null`
- Storage cleanup is best-effort (logs warning, doesn't throw)

## Files

| Action | Path |
|---|---|
| Modify | `src/hooks/useAvatarUpload.ts` |
| Modify | `src/components/AvatarPicker.tsx` |
| Modify | `src/pages/SettingsPage.tsx` |
| Modify | `src/pages/PlayersPage.tsx` |

## Dependencies

None. No new packages.

## Success Criteria

- [x] 10 default avatars shown in grid (5x2) inside AvatarPicker
- [x] Selected default visually highlighted
- [x] Tapping default sets it immediately
- [x] Old photo deleted from storage on switch
- [x] "Remove" reverts to deterministic fallback
- [x] Works for users (Settings) and players (Players page)
