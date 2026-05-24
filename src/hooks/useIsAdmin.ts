import { useAuth } from './useAuth'
import { useProfile } from './useProfile'

export function useIsAdmin(): boolean {
  const { user } = useAuth()
  const { data: profile } = useProfile(user?.id)
  return profile?.role === 'admin'
}
