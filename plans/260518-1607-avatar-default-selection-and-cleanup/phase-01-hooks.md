---
phase: 1
status: completed
---

# Phase 1: Update Hooks

## Files

- `src/hooks/useAvatarUpload.ts`

## Context

Current `useAvatarUpload.ts` has `useAvatarUpload()` and `useAvatarDelete()`. Both need:
1. A shared cleanup helper that removes old uploaded photos from Supabase Storage
2. A new `useSetDefaultAvatar()` hook for setting external multiavatar URLs
3. Old avatar URL parameter for cleanup before any operation

## Implementation

### 1. Add cleanup helper

```typescript
const DEFAULT_AVATAR_PREFIX = 'https://multiavatar.com/'

async function cleanupOldAvatar(
  entity: EntityType,
  id: string,
  oldUrl?: string | null,
) {
  if (!oldUrl || oldUrl.startsWith(DEFAULT_AVATAR_PREFIX)) return
  const path = `${entity}/${id}.jpg`
  const { error } = await supabase.storage.from('avatars').remove([path])
  if (error) console.warn('Avatar cleanup failed:', error.message)
}
```

### 2. Update `useAvatarUpload()`

Add `oldAvatarUrl` to `UploadParams`. Call `cleanupOldAvatar()` before upload.

### 3. Add `useSetDefaultAvatar()`

New hook. Calls cleanup if old was stored photo, then updates DB `avatar_url` with the external URL.

```typescript
interface SetDefaultParams {
  url: string
  entity: EntityType
  id: string
  oldAvatarUrl?: string | null
}

export function useSetDefaultAvatar() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ url, entity, id, oldAvatarUrl }: SetDefaultParams) => {
      await cleanupOldAvatar(entity, id, oldAvatarUrl)
      if (entity === 'users') {
        const { error } = await supabase
          .from('profiles')
          .upsert({ id, avatar_url: url, updated_at: new Date().toISOString() })
        if (error) throw error
      } else {
        const { error } = await supabase
          .from('players')
          .update({ avatar_url: url })
          .eq('id', id)
        if (error) throw error
      }
      return url
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['players'] })
      qc.invalidateQueries({ queryKey: ['profiles'] })
    },
  })
}
```

### 4. Update `useAvatarDelete()`

Add `oldAvatarUrl` param. Call cleanup before setting DB to null.

## Todo

- [x] Add `DEFAULT_AVATAR_PREFIX` constant and `cleanupOldAvatar()` helper
- [x] Update `UploadParams` with `oldAvatarUrl`
- [x] Call `cleanupOldAvatar()` in `useAvatarUpload` before upload
- [x] Create `useSetDefaultAvatar()` hook
- [x] Update `useAvatarDelete` with `oldAvatarUrl` and cleanup
