# Phase 02: Core Components & Utilities

## Priority
P1

## Description
Build reusable Avatar component, image compression utility, upload hook, and AvatarPicker UI.

## Related Code Files
- `src/components/Avatar.tsx` (create)
- `src/components/AvatarPicker.tsx` (create)
- `src/hooks/useAvatarUpload.ts` (create)
- `src/lib/image.ts` (create)
- `src/types/database.ts` (modify - add Profile type)

## Implementation Steps

### Step 1: Image Compression Utility

Create `src/lib/image.ts`:

```typescript
/**
 * Compress and resize an image file to a square of maxSize pixels.
 * Center-crops to square, outputs JPEG at 0.85 quality.
 */
export async function compressImage(
  file: File,
  maxSize: number = 200
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)

    img.onload = () => {
      URL.revokeObjectURL(url)

      const canvas = document.createElement('canvas')
      canvas.width = maxSize
      canvas.height = maxSize

      const ctx = canvas.getContext('2d')
      if (!ctx) {
        reject(new Error('Failed to get canvas context'))
        return
      }

      // Center-crop to square
      const minDim = Math.min(img.width, img.height)
      const sx = (img.width - minDim) / 2
      const sy = (img.height - minDim) / 2

      ctx.drawImage(img, sx, sy, minDim, minDim, 0, 0, maxSize, maxSize)

      canvas.toBlob(
        (blob) => {
          if (blob) resolve(blob)
          else reject(new Error('Canvas toBlob failed'))
        },
        'image/jpeg',
        0.85
      )
    }

    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Failed to load image'))
    }

    img.src = url
  })
}
```

### Step 2: Avatar Component

Create `src/components/Avatar.tsx`:

```typescript
import { useState } from 'react'

interface AvatarProps {
  src?: string | null
  name: string
  size?: number
  className?: string
  bgColor?: string
  textColor?: string
}

function getInitial(name: string): string {
  return name.trim().charAt(0).toUpperCase()
}

export default function Avatar({
  src,
  name,
  size = 40,
  className = '',
  bgColor = '#e5e7eb',
  textColor = '#6b7280',
}: AvatarProps) {
  const [error, setError] = useState(false)
  const showImage = src && !error

  return (
    <div
      className={`rounded-full flex items-center justify-center shrink-0 overflow-hidden ${className}`}
      style={{
        width: size,
        height: size,
        backgroundColor: showImage ? undefined : bgColor,
        color: textColor,
        fontSize: size * 0.4,
        fontWeight: 700,
        lineHeight: 1,
      }}
    >
      {showImage ? (
        <img
          src={src}
          alt={name}
          className="w-full h-full object-cover"
          onError={() => setError(true)}
          draggable={false}
        />
      ) : (
        getInitial(name)
      )}
    </div>
  )
}
```

### Step 3: Avatar Upload Hook

Create `src/hooks/useAvatarUpload.ts`:

```typescript
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { compressImage } from '../lib/image'

type EntityType = 'users' | 'players'

interface UploadParams {
  file: File
  entity: EntityType
  id: string
}

function getPublicUrl(path: string): string {
  const { data } = supabase.storage.from('avatars').getPublicUrl(path)
  return data.publicUrl
}

export function useAvatarUpload() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async ({ file, entity, id }: UploadParams) => {
      // Compress
      const blob = await compressImage(file, 200)
      const path = `${entity}/${id}.jpg`

      // Upload (upsert overwrites existing)
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(path, blob, {
          contentType: 'image/jpeg',
          upsert: true,
        })

      if (uploadError) throw uploadError

      // Get public URL
      const publicUrl = getPublicUrl(path)

      // Update database record
      if (entity === 'users') {
        const { error: dbError } = await supabase
          .from('profiles')
          .upsert({ id, avatar_url: publicUrl, updated_at: new Date().toISOString() })
        if (dbError) throw dbError
      } else {
        const { error: dbError } = await supabase
          .from('players')
          .update({ avatar_url: publicUrl })
          .eq('id', id)
        if (dbError) throw dbError
      }

      return publicUrl
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['players'] })
      qc.invalidateQueries({ queryKey: ['profiles'] })
    },
  })
}

export function useAvatarDelete() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async ({ entity, id }: { entity: EntityType; id: string }) => {
      const path = `${entity}/${id}.jpg`

      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from('avatars')
        .remove([path])

      if (storageError) throw storageError

      // Clear database record
      if (entity === 'users') {
        const { error: dbError } = await supabase
          .from('profiles')
          .upsert({ id, avatar_url: null, updated_at: new Date().toISOString() })
        if (dbError) throw dbError
      } else {
        const { error: dbError } = await supabase
          .from('players')
          .update({ avatar_url: null })
          .eq('id', id)
        if (dbError) throw dbError
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['players'] })
      qc.invalidateQueries({ queryKey: ['profiles'] })
    },
  })
}
```

### Step 4: AvatarPicker Component

Create `src/components/AvatarPicker.tsx`:

```typescript
import { useRef } from 'react'
import { Camera, ImageIcon, Trash2, X } from 'lucide-react'

interface AvatarPickerProps {
  onSelect: (file: File) => void
  onRemove: () => void
  onClose: () => void
  hasAvatar: boolean
}

export default function AvatarPicker({ onSelect, onRemove, onClose, hasAvatar }: AvatarPickerProps) {
  const cameraInputRef = useRef<HTMLInputElement>(null)
  const galleryInputRef = useRef<HTMLInputElement>(null)

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      onSelect(file)
      onClose()
    }
    e.target.value = '' // reset
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" onClick={onClose}>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40" />

      {/* Sheet */}
      <div
        className="relative w-full max-w-md bg-white rounded-t-2xl p-4 space-y-1 animate-in slide-in-from-bottom"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-3" />

        <button
          onClick={() => cameraInputRef.current?.click()}
          className="w-full flex items-center gap-3 px-4 py-4 text-left active:bg-gray-50 rounded-xl transition-colors"
        >
          <Camera className="w-5 h-5 text-gray-600" />
          <span className="text-[15px] font-medium text-gray-900">Take Photo</span>
        </button>

        <button
          onClick={() => galleryInputRef.current?.click()}
          className="w-full flex items-center gap-3 px-4 py-4 text-left active:bg-gray-50 rounded-xl transition-colors"
        >
          <ImageIcon className="w-5 h-5 text-gray-600" />
          <span className="text-[15px] font-medium text-gray-900">Choose from Gallery</span>
        </button>

        {hasAvatar && (
          <button
            onClick={() => { onRemove(); onClose() }}
            className="w-full flex items-center gap-3 px-4 py-4 text-left active:bg-red-50 rounded-xl transition-colors"
          >
            <Trash2 className="w-5 h-5 text-red-500" />
            <span className="text-[15px] font-medium text-red-600">Remove Photo</span>
          </button>
        )}

        <button
          onClick={onClose}
          className="w-full flex items-center justify-center gap-2 px-4 py-4 mt-2 bg-gray-100 rounded-xl active:bg-gray-200 transition-colors"
        >
          <X className="w-5 h-5 text-gray-500" />
          <span className="text-[15px] font-medium text-gray-600">Cancel</span>
        </button>

        {/* Hidden inputs */}
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="user"
          className="hidden"
          onChange={handleFile}
        />
        <input
          ref={galleryInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFile}
        />
      </div>
    </div>
  )
}
```

### Step 5: Update Database Types

Modify `src/types/database.ts` to add Profile type:

```typescript
export interface Profile {
  id: string
  avatar_url?: string | null
  updated_at?: string
}
```

Also add to Player if not already present (should be):
```typescript
export interface Player {
  id: string
  name: string
  email?: string | null
  avatar_url?: string | null
  is_active: boolean
  created_at: string
  created_by: string
}
```

## Todo
- [ ] Create `src/lib/image.ts` with `compressImage()`
- [ ] Create `src/components/Avatar.tsx`
- [ ] Create `src/hooks/useAvatarUpload.ts` (useAvatarUpload + useAvatarDelete)
- [ ] Create `src/components/AvatarPicker.tsx`
- [ ] Add `Profile` type to `src/types/database.ts`
- [ ] Run type check: `npx tsc --noEmit`

## Success Criteria
- `Avatar` renders name initial when no src
- `Avatar` renders image when src provided, falls back on error
- `compressImage()` reduces a 2MB photo to ~10KB JPEG
- `AvatarPicker` opens bottom sheet with Camera/Gallery/Remove/Cancel options
- Upload hook compresses, uploads to Storage, updates DB
