# Code Review: Avatar Feature Implementation

## Scope
- **Files reviewed:** 6 (useAvatarUpload.ts, AvatarPicker.tsx, SettingsPage.tsx, PlayersPage.tsx, Avatar.tsx, avatar.ts)
- **LOC:** ~500
- **Focus:** Recent avatar upload feature (commits b30a501, e8fdd71)
- **Scout findings:** 5 edge cases discovered (see below)

---

## Overall Assessment

Solid implementation. Clean separation between upload hook, picker UI, and page integration. TypeScript types are consistent. The multiavatar fallback strategy is simple and effective. A few edge cases around cleanup and error handling need attention.

**Score: 7/10**

---

## Critical Issues

None.

---

## High Priority

### 1. cleanupOldAvatar silently fails on storage errors (useAvatarUpload.ts:17)

```typescript
if (error) console.warn('Avatar cleanup failed:', error.message)
```

**Problem:** Storage cleanup failure is only console.warn'd, not thrown. If cleanup fails but upload succeeds, the old file is orphaned in storage. More importantly, if the old file was NOT from multiavatar (e.g. a previously uploaded file), and cleanup fails, the user now has TWO avatar files in storage but only one DB record.

**Impact:** Storage bloat over time. No user feedback that cleanup failed.

**Fix:** Consider whether cleanup failure should block the operation. If not, at minimum log more context (path, entity, id).

```typescript
if (error) {
  console.warn(`Avatar cleanup failed for ${entity}/${id}:`, error.message)
  // Optionally: report to error tracking service
}
```

### 2. Race condition: cleanup runs before upload, but no rollback on upload failure (useAvatarUpload.ts:36-48)

**Problem:** If `cleanupOldAvatar` succeeds but `upload` fails, the old avatar is gone and the user has no avatar. The DB still points to the old URL which no longer exists in storage.

**Impact:** Broken avatar images for users.

**Fix:** Swap order — upload first, then cleanup old. Or wrap in a transaction-like pattern. However, Supabase storage does not support transactions. Alternative: upload to a temp path first, then move after DB update succeeds.

### 3. Avatar.tsx: fallback img onError loops if multiavatar.com is down (Avatar.tsx:53-59)

```typescript
<img src={defaultUrl} ... onError={() => setError(true)} />
```

**Problem:** If `src` is undefined/null, Avatar renders the default multiavatar `<img>`. If multiavatar.com is unreachable, `onError` fires, `setError(true)`, and the component renders the initial. This is correct. But if `src` is a broken uploaded URL (file deleted from storage but DB still references it), the first `<img src={src}>` fails, `setError(true)`, then the fallback multiavatar `<img>` also fails (if multiavatar is down), and there is no further fallback — the component shows nothing (empty div with bgColor).

**Impact:** Blank avatar if both primary and fallback images fail.

**Fix:** The current behavior is acceptable (shows bgColor background, no text since `error` branch shows initial). Actually re-reading: when `error` is true and `showImage` is false, it renders `getInitial(name)`. So even if multiavatar fails, the initial is shown. This is fine.

Wait — re-checking: line 50-52:
```typescript
) : error ? (
  getInitial(name)
) : (
```

If `src` is set but errors, `showImage = false` (because `error = true`), so it goes to the `error` branch and shows the initial. The fallback multiavatar img is NOT rendered. This is actually correct — if the user's uploaded avatar fails, show their initial instead of a random default avatar. Good design.

**Verdict:** Not an issue. The logic is sound.

---

## Medium Priority

### 4. No loading state during avatar operations (SettingsPage.tsx, PlayersPage.tsx)

**Problem:** The picker closes immediately after selection (`onClose()` is called in `handleFile` and `handleSelectDefault`). The upload/delete/setDefault mutations run in background. There is no visual feedback that an operation is in progress.

**SettingsPage.tsx:71-73:**
```typescript
onSelect={(file) => upload.mutate({...})}  // no loading indicator
```

**Impact:** User may tap multiple times thinking the first tap did not work. Or they navigate away before operation completes.

**Fix:** Keep picker open with a loading overlay, or show a toast/loading spinner on the avatar itself. At minimum, disable the avatar button while `upload.isPending || remove.isPending || setDefault.isPending`.

SettingsPage already disables the button during upload (`disabled={upload.isPending}` on line 45), but not for remove/setDefault. PlayersPage SwipePlayerItem has no disabled state at all.

### 5. Inconsistent query invalidation scope (useAvatarUpload.ts:67-70, 103-106, 130-133)

```typescript
onSuccess: () => {
  qc.invalidateQueries({ queryKey: ['players'] })
  qc.invalidateQueries({ queryKey: ['profiles'] })
}
```

**Problem:** All three mutations invalidate BOTH `players` and `profiles` regardless of entity type. When uploading a player avatar, `profiles` is unnecessarily invalidated. When uploading a user avatar, `players` is unnecessarily invalidated.

**Impact:** Minor performance hit, unnecessary refetches.

**Fix:** Invalidate only the relevant query key based on entity:

```typescript
onSuccess: (_data, variables) => {
  if (variables.entity === 'users') {
    qc.invalidateQueries({ queryKey: ['profiles'] })
  } else {
    qc.invalidateQueries({ queryKey: ['players'] })
  }
}
```

### 6. AvatarPicker: no file type validation (AvatarPicker.tsx:28-35)

```typescript
const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
  const file = e.target.files?.[0]
  if (file) {
    onSelect(file)
    onClose()
  }
}
```

**Problem:** Any file type can be selected (despite `accept="image/*"`, browsers allow overriding). A user could select a `.exe` or `.pdf` which would be passed to `compressImage`.

**Impact:** `compressImage` would fail with "Failed to load image" (img.onerror). User sees no feedback, picker just closes.

**Fix:** Add file type check before calling `onSelect`:

```typescript
const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
  const file = e.target.files?.[0]
  if (file) {
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file')
      e.target.value = ''
      return
    }
    onSelect(file)
    onClose()
  }
  e.target.value = ''
}
```

### 7. AvatarPicker: no file size validation

**Problem:** Large images (e.g. 50MB RAW photo) will be passed to `compressImage`, causing memory issues or long processing times on mobile.

**Fix:** Add a size limit check (e.g. 10MB) before processing.

### 8. useAvatarUpload.ts: `upsert` for users but `update` for players — inconsistent

**Problem:** User profile uses `upsert` (insert if not exists), player uses `update` (must exist). This is semantically correct (profile row may not exist yet, player row must exist), but the inconsistency could confuse future maintainers.

**Verdict:** Acceptable given the domain logic. Document with a comment.

---

## Low Priority

### 9. DEFAULT_AVATAR_PREFIX check is fragile (useAvatarUpload.ts:7)

```typescript
const DEFAULT_AVATAR_PREFIX = 'https://multiavatar.com/'
```

**Problem:** This prefix is duplicated in `avatar.ts` (line 16). If multiavatar URL format changes, both files need updating. Also, `startsWith` check means any URL starting with this prefix is skipped — correct for the current defaults, but if multiavatar adds query params or paths, this could break.

**Fix:** Export the prefix from `avatar.ts` and import it in `useAvatarUpload.ts`.

### 10. AvatarPicker grid: 5 columns with 14px avatars may be tight on small screens

**Problem:** `grid-cols-5 gap-3` with `w-14 h-14` (56px) avatars = 5*56 + 4*12 = 328px minimum width. On a 320px iPhone SE, this overflows slightly with padding.

**Impact:** Minor horizontal scroll or clipped avatars on very small screens.

**Fix:** Use `grid-cols-5 gap-2` or responsive `grid-cols-5 [@media(max-width:380px)]:gap-2`.

### 11. PodiumChart.tsx: unused `getInitials` function (lint error)

Line 91 defines `getInitials` which is never used. This is a pre-existing lint error, not caused by avatar feature, but it shows in the lint output.

### 12. PlayerSelector.tsx: unused `User` import (lint error)

Line 4 imports `User` from lucide-react but never uses it. Pre-existing.

---

## Edge Cases Found by Scout

| # | Edge Case | Current Behavior | Risk |
|---|-----------|-----------------|------|
| 1 | `oldAvatarUrl` is `undefined`/`null` | `cleanupOldAvatar` returns early (line 14) | Correct, no risk |
| 2 | `oldAvatarUrl` is a multiavatar URL | `cleanupOldAvatar` skips it (line 14) | Correct, prevents deleting external assets |
| 3 | Upload succeeds but DB update fails | Storage has new file, DB has old URL | Orphaned file in storage; user sees old avatar |
| 4 | User rapidly taps avatar button during upload | `upload.mutate` called again while pending | React Query deduplicates, but no visual feedback |
| 5 | Player deleted while avatar picker is open | `editAvatarPlayer` becomes stale | Picker stays open; operations would fail on non-existent player |
| 6 | `compressImage` receives non-image file | `img.onerror` fires, rejects promise | Mutation fails silently (no error UI) |
| 7 | Network failure during `getPublicUrl` | This is synchronous, no network call | No risk — `getPublicUrl` is local URL construction |
| 8 | Two users upload avatars simultaneously for same player | Last write wins; first file orphaned | Race condition in storage |

---

## Positive Observations

1. **Correct cleanup skip:** `cleanupOldAvatar` properly skips multiavatar URLs — will not attempt to delete external assets.
2. **Consistent `oldAvatarUrl` pattern:** Both SettingsPage and PlayersPage pass `oldAvatarUrl` correctly to all three mutation hooks.
3. **Avatar component handles errors gracefully:** `onError` fallback to initials is well-implemented.
4. **Deterministic default avatars:** `hashName` in `avatar.ts` ensures same name always gets same default avatar.
5. **Image compression:** `compressImage` center-crops to square and outputs JPEG at reasonable quality — good for mobile.
6. **Type safety:** `EntityType` union type prevents invalid entity values. `UploadParams` interface is clear.
7. **AvatarPicker is reusable:** Clean props interface, no hardcoded entity logic — used correctly in both pages.
8. **Supabase upsert for profiles:** Handles the case where profile row does not exist yet.

---

## Recommended Actions (Prioritized)

1. **[High]** Fix operation order in `useAvatarUpload`: upload to storage first, then update DB, then cleanup old avatar (to prevent data loss on upload failure)
2. **[High]** Add error handling/feedback for mutation failures (toast or inline error)
3. **[Medium]** Scope query invalidation to the relevant entity only
4. **[Medium]** Add file type and size validation in AvatarPicker
5. **[Medium]** Show loading state on avatar button during any avatar operation (not just upload)
6. **[Low]** Export `DEFAULT_AVATAR_PREFIX` from `avatar.ts` to eliminate duplication
7. **[Low]** Fix pre-existing lint errors in PodiumChart.tsx and PlayerSelector.tsx

---

## Metrics

| Metric | Value |
|--------|-------|
| Type Coverage | Pass (tsc --noEmit clean) |
| Lint Issues | 3 errors (all pre-existing, not in reviewed files) |
| Test Coverage | Not reviewed (no test files found) |
| Security Issues | None critical |

---

## Unresolved Questions

1. Is there a storage bucket size limit or cleanup job for orphaned avatar files?
2. Should avatar uploads be restricted by file size (e.g. 5MB max before compression)?
3. Is the `upsert` on profiles table safe — could it accidentally overwrite other profile fields?
