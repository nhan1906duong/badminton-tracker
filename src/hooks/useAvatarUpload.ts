import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { compressImage } from '../lib/image'
import { DEFAULT_AVATAR_PREFIX } from '../lib/avatar'

type EntityType = 'users' | 'players'

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
      const blob = await compressImage(file, 200)
      const path = `${entity}/${id}.jpg`

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(path, blob, {
          contentType: 'image/jpeg',
          upsert: true,
        })

      if (uploadError) throw uploadError

      const publicUrl = getPublicUrl(path)

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
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['players'] })
      qc.invalidateQueries({ queryKey: ['players', vars.id] })
      qc.invalidateQueries({ queryKey: ['profiles'] })
    },
  })
}

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
        const { error: dbError } = await supabase
          .from('profiles')
          .upsert({ id, avatar_url: url, updated_at: new Date().toISOString() })
        if (dbError) throw dbError
      } else {
        const { error: dbError } = await supabase
          .from('players')
          .update({ avatar_url: url })
          .eq('id', id)
        if (dbError) throw dbError
      }

      return url
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['players'] })
      qc.invalidateQueries({ queryKey: ['players', vars.id] })
      qc.invalidateQueries({ queryKey: ['profiles'] })
    },
  })
}

export function useAvatarDelete() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async ({ entity, id, oldAvatarUrl }: { entity: EntityType; id: string; oldAvatarUrl?: string | null }) => {
      await cleanupOldAvatar(entity, id, oldAvatarUrl)

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
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['players'] })
      qc.invalidateQueries({ queryKey: ['players', vars.id] })
      qc.invalidateQueries({ queryKey: ['profiles'] })
    },
  })
}
