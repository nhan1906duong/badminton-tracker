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

      const { error: storageError } = await supabase.storage
        .from('avatars')
        .remove([path])

      if (storageError) throw storageError

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
