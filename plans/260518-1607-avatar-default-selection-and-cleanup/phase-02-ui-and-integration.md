---
phase: 2
status: completed
---

# Phase 2: UI & Page Integration

## Files

- `src/components/AvatarPicker.tsx`
- `src/pages/SettingsPage.tsx`
- `src/pages/PlayersPage.tsx`

## Context

AvatarPicker currently shows a bottom sheet with Take Photo / Gallery / Remove / Cancel. It needs a grid of 10 multiavatar defaults at the top.

## Implementation

### 1. Update AvatarPicker props

```typescript
interface AvatarPickerProps {
  currentAvatarUrl?: string | null
  onSelect: (file: File) => void      // photo upload (keep name for compat)
  onSelectDefault: (url: string) => void
  onRemove: () => void
  onClose: () => void
}
```

Derive `hasAvatar` internally: `const hasAvatar = !!currentAvatarUrl`

### 2. Default avatar grid

- 2 rows x 5 columns
- Each item: circular image, ~64px
- Check if `currentAvatarUrl` matches the URL for highlighting
- Selected: `ring-2 ring-green-500`
- Tapping calls `onSelectDefault(url)` and `onClose()`

```typescript
const DEFAULT_AVATARS = Array.from({ length: 10 }, (_, i) =>
  `https://multiavatar.com/${i + 1}`
)
```

### 3. Layout

Top to bottom inside bottom sheet:
1. Drag handle
2. Default grid (2 rows x 5)
3. Divider
4. Take Photo button
5. Choose from Gallery button
6. Remove Photo (if hasAvatar)
7. Cancel button

### 4. Update SettingsPage

```typescript
import { useSetDefaultAvatar } from '../hooks/useAvatarUpload'

const setDefault = useSetDefaultAvatar()

<AvatarPicker
  currentAvatarUrl={userAvatarUrl}
  onSelect={(file) => upload.mutate({ file, entity: 'users', id: user.id, oldAvatarUrl: userAvatarUrl })}
  onSelectDefault={(url) => setDefault.mutate({ url, entity: 'users', id: user.id, oldAvatarUrl: userAvatarUrl })}
  onRemove={() => remove.mutate({ entity: 'users', id: user.id, oldAvatarUrl: userAvatarUrl })}
  onClose={() => setShowPicker(false)}
/>
```

### 5. Update PlayersPage

Same pattern, using `editAvatarPlayer` state:

```typescript
const avatarUrl = editAvatarPlayer?.avatar_url

<AvatarPicker
  currentAvatarUrl={avatarUrl}
  onSelect={(file) => upload.mutate({ file, entity: 'players', id: editAvatarPlayer.id, oldAvatarUrl: avatarUrl })}
  onSelectDefault={(url) => setDefault.mutate({ url, entity: 'players', id: editAvatarPlayer.id, oldAvatarUrl: avatarUrl })}
  onRemove={() => remove.mutate({ entity: 'players', id: editAvatarPlayer.id, oldAvatarUrl: avatarUrl })}
  onClose={() => setEditAvatarPlayer(null)}
/>
```

## Todo

- [x] Update `AvatarPickerProps` interface
- [x] Add default avatar grid with selection highlight
- [x] Wire `onSelectDefault` callback
- [x] Update SettingsPage: import `useSetDefaultAvatar`, pass new props
- [x] Update PlayersPage: import `useSetDefaultAvatar`, pass new props
- [x] Test both user and player avatar flows
