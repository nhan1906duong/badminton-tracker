# Brainstorm: Default Avatar Selection & Storage Cleanup

**Date:** 2026-05-18
**Scope:** Avatar picker UX + storage lifecycle management

---

## Problem Statement

1. Users cannot pick a default avatar. The only options are upload photo / remove.
2. Old uploaded photos accumulate in Supabase Storage when users switch avatars.

---

## Current State

| Component | Purpose |
|---|---|
| `Avatar.tsx` | Displays image. Fallback chain: `src` -> deterministic multiavatar (name hash) -> initial |
| `AvatarPicker.tsx` | Bottom sheet with Take Photo / Gallery / Remove / Cancel |
| `useAvatarUpload.ts` | Compress + upload to `avatars/{entity}/{id}.jpg`, update DB |
| `useAvatarDelete.ts` | Remove from storage, set `avatar_url = null` in DB |
| `lib/avatar.ts` | `getDefaultAvatarUrl(name)` returns deterministic multiavatar |

Avatar state is stored in `avatar_url` column (profiles / players tables).

---

## Key Decisions (User Confirmed)

1. **Default storage:** Store external multiavatar URL directly in DB. No upload to storage.
2. **Fallback:** Keep existing deterministic fallback when `avatar_url = null`.
3. **Cleanup:** Always delete old storage file before any new upload or switch.

---

## Recommended Solution

### Avatar Types

| Type | `avatar_url` value | Storage? |
|---|---|---|
| None (fallback) | `null` / absent | No |
| Default (user-selected) | `https://multiavatar.com/{1-10}` | No |
| Uploaded photo | Supabase Storage public URL | Yes |

### AvatarPicker Redesign

Bottom sheet layout:

```
---
[1] [2] [3] [4] [5]     <- 5 defaults, row 1
[6] [7] [8] [9] [10]    <- 5 defaults, row 2
    (selected has ring)
-------------------------
Take Photo
Choose from Gallery
-------------------------
Remove Photo    (if avatar_url != null)
Cancel
```

- Each default: ~64px circular image
- Selected default highlighted with `ring-2 ring-green-500`
- Tapping a default calls `onSelectDefault(url)` immediately
- "Remove" sets `avatar_url = null` (reverts to deterministic fallback)

### Props Change

```typescript
interface AvatarPickerProps {
  currentAvatarUrl?: string | null  // NEW: for highlighting selected default
  onSelect: (file: File) => void    // existing: photo upload
  onSelectDefault: (url: string) => void  // NEW: default selection
  onRemove: () => void              // existing
  onClose: () => void               // existing
}
```

`hasAvatar` derived internally: `const hasAvatar = !!currentAvatarUrl`

### Hook Changes

**Extract shared cleanup helper:**

```typescript
const DEFAULT_PREFIX = 'https://multiavatar.com/'

async function cleanupOldAvatar(
  entity: EntityType,
  id: string,
  oldUrl?: string | null,
) {
  if (!oldUrl || oldUrl.startsWith(DEFAULT_PREFIX)) return
  const path = `${entity}/${id}.jpg`
  const { error } = await supabase.storage.from('avatars').remove([path])
  if (error) console.warn('Avatar cleanup failed:', error.message)
  // don't throw - cleanup is best-effort
}
```

**`useAvatarUpload()`** - add `oldAvatarUrl` param, call cleanup before upload.

**`useSetDefaultAvatar()`** - NEW hook:
- Calls cleanup if old was a stored photo
- Updates DB `avatar_url` with the multiavatar URL
- No storage operation

**`useAvatarDelete()`** - add `oldAvatarUrl` param, call cleanup before setting null.

### Page Integration (SettingsPage + PlayersPage)

Both pages follow same pattern:

```typescript
const upload = useAvatarUpload()
const setDefault = useSetDefaultAvatar()
const remove = useAvatarDelete()

// In render:
<AvatarPicker
  currentAvatarUrl={avatarUrl}
  onSelect={(file) => upload.mutate({ file, entity, id, oldAvatarUrl: avatarUrl })}
  onSelectDefault={(url) => setDefault.mutate({ url, entity, id, oldAvatarUrl: avatarUrl })}
  onRemove={() => remove.mutate({ entity, id, oldAvatarUrl: avatarUrl })}
  onClose={() => setShowPicker(false)}
/>
```

---

## Implementation Files

| File | Change |
|---|---|
| `src/hooks/useAvatarUpload.ts` | Add `cleanupOldAvatar`, `useSetDefaultAvatar`, update existing hooks |
| `src/components/AvatarPicker.tsx` | Add default grid, update props, derive `hasAvatar` |
| `src/pages/SettingsPage.tsx` | Pass `currentAvatarUrl`, wire `onSelectDefault`, pass `oldAvatarUrl` |
| `src/pages/PlayersPage.tsx` | Same as SettingsPage |

No new files. No DB migrations needed. No new dependencies.

---

## Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Multiavatar.com unavailable | `Avatar.tsx` already handles `onError` -> falls back to initial |
| Cleanup fails (storage error) | Best-effort: log warning, don't block DB update |
| Old legacy avatar URLs | Cleanup checks prefix; non-matching URLs treated as stored and deleted. Supabase `remove()` is safe for non-existent paths |
| AvatarPicker gets crowded | 10 items at ~64px + 2 action buttons + remove + cancel fits within `max-w-md` bottom sheet |

---

## Success Criteria

- [ ] Grid of 10 multiavatar defaults visible in picker
- [ ] Tapping default immediately sets it as avatar
- [ ] Selected default visually highlighted
- [ ] Old photo deleted from storage when switching to default
- [ ] Old photo deleted from storage before new photo upload
- [ ] "Remove" deletes stored photo and reverts to deterministic fallback
- [ ] Works for both users (Settings) and players (Players page)

---

## Unresolved Questions

None.
