# Phase 03: App Integration

## Priority
P1

## Description
Integrate Avatar component and upload flow into all app screens.

## Related Code Files
- `src/pages/SettingsPage.tsx` (modify)
- `src/pages/PlayersPage.tsx` (modify)
- `src/components/PlayerSelector.tsx` (modify)
- `src/components/PodiumChart.tsx` (modify)

## Implementation Steps

### Step 1: SettingsPage — User Avatar

Replace the static User icon in the profile section with Avatar + tap-to-upload:

```tsx
// Add imports
import { useState } from 'react'
import Avatar from '../components/Avatar'
import AvatarPicker from '../components/AvatarPicker'
import { useAvatarUpload, useAvatarDelete } from '../hooks/useAvatarUpload'

// In component, add state
const [showPicker, setShowPicker] = useState(false)
const upload = useAvatarUpload()
const remove = useAvatarDelete()

// Replace profile section avatar div with:
<button
  onClick={() => setShowPicker(true)}
  className="relative shrink-0"
>
  <Avatar
    src={user?.user_metadata?.avatar_url /* or from profile query */}
    name={user?.email || 'User'}
    size={48}
    bgColor="#dcfce7"
    textColor="#16a34a"
  />
  {/* Camera indicator */}
  <div className="absolute -bottom-0.5 -right-0.5 w-5 h-5 bg-green-600 rounded-full flex items-center justify-center border-2 border-white">
    <Camera className="w-3 h-3 text-white" />
  </div>
</button>

// Add AvatarPicker
{showPicker && (
  <AvatarPicker
    hasAvatar={!!user?.user_metadata?.avatar_url}
    onSelect={(file) => upload.mutate({ file, entity: 'users', id: user!.id })}
    onRemove={() => remove.mutate({ entity: 'users', id: user!.id })}
    onClose={() => setShowPicker(false)}
  />
)}
```

Also add a `useProfile` hook to fetch the user's profile (with avatar_url):

```typescript
// src/hooks/useProfile.ts
export function useProfile(userId?: string) {
  return useQuery({
    queryKey: ['profiles', userId],
    queryFn: async () => {
      if (!userId) return null
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()
      if (error) throw error
      return data as Profile
    },
    enabled: !!userId,
  })
}
```

### Step 2: PlayersPage — Player Avatars

In the player list items, replace the colored initial circle with Avatar component.

Current code in PlayersPage likely has:
```tsx
<div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold">
  {player.name.charAt(0)}
</div>
```

Replace with:
```tsx
<Avatar
  src={player.avatar_url}
  name={player.name}
  size={40}
  bgColor="#dbeafe"
  textColor="#2563eb"
/>
```

Also add tap-to-upload on player detail/edit. If there's a player detail/edit view, add AvatarPicker there. If not, add a simple tap on the player row to edit avatar (or add it to an existing edit flow).

### Step 3: PlayerSelector — Selection Grid

In `src/components/PlayerSelector.tsx`, replace the User/Check icon with Avatar:

Current:
```tsx
<div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ...`}>
  {isSelected ? <Check ... /> : <User ... />}
</div>
```

Replace with:
```tsx
<div className="relative shrink-0">
  <Avatar
    src={player.avatar_url}
    name={player.name}
    size={40}
    className={isSelected ? 'ring-2 ring-offset-1 ' + (team === 'A' ? 'ring-blue-500' : 'ring-red-500') : ''}
    bgColor={isSelected ? (team === 'A' ? '#3b82f6' : '#ef4444') : '#f3f4f6'}
    textColor={isSelected ? '#ffffff' : '#9ca3af'}
  />
  {isSelected && (
    <div className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-white rounded-full flex items-center justify-center">
      <Check className="w-3 h-3 text-green-500" />
    </div>
  )}
</div>
```

Note: When selected, show a checkmark badge overlay instead of replacing the avatar with a check icon.

### Step 4: PodiumChart — SVG Avatar

In `src/components/PodiumChart.tsx`, replace the inline avatar div with the Avatar component.

Current:
```tsx
<div className="w-6 h-6 rounded-full flex items-center justify-center shrink-0" style={{...}}>
  {player.avatarUrl ? <img ... /> : getInitials(player.name)}
</div>
```

Replace with:
```tsx
<Avatar
  src={player.avatarUrl}
  name={player.name}
  size={24}
  bgColor="rgba(255,255,255,0.9)"
  textColor={theme.body}
/>
```

Note: `PodiumPlayer` interface uses `avatarUrl` (camelCase) while the new Avatar component expects `src`. Map it in PodiumChart.

### Step 5: HomePage PodiumChart

In `src/pages/HomePage.tsx`, the PodiumChart already passes player data. Ensure `avatar_url` is passed through:

```tsx
<PodiumChart
  players={top5.map((p, i) => ({
    rank: i + 1,
    name: p.name,
    wins: p.wins,
    matchesPlayed: p.matchesPlayed,
    value: p.losses * 5,
    valueLabel: 'k',
    avatarUrl: p.avatar_url, // <-- add this
  }))}
/>
```

## Todo
- [ ] Create `src/hooks/useProfile.ts`
- [ ] Modify `src/pages/SettingsPage.tsx` — add Avatar, AvatarPicker, upload/remove
- [ ] Modify `src/pages/PlayersPage.tsx` — use Avatar component in player list
- [ ] Modify `src/components/PlayerSelector.tsx` — use Avatar with checkmark overlay
- [ ] Modify `src/components/PodiumChart.tsx` — use Avatar component
- [ ] Modify `src/pages/HomePage.tsx` — pass `avatarUrl` to PodiumChart
- [ ] Run type check
- [ ] Manual test: Settings avatar upload, player list, selector, podium

## Success Criteria
- [ ] Settings profile shows user avatar with camera badge → tap opens picker
- [ ] Player list shows avatars with colored initials fallback
- [ ] PlayerSelector shows avatars with checkmark overlay when selected
- [ ] PodiumChart displays player avatars in top-5 columns
- [ ] All fallbacks work: no avatar → initial letter, broken URL → initial letter
