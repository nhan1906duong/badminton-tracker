import { createContext, useCallback, useEffect, useState, type ReactNode } from 'react'
import { type User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'

export interface AuthContextValue {
  user: User | null
  isLoading: boolean
  isSendingOtp: boolean
  isVerifying: boolean
  otpSent: boolean
  signIn: (email: string) => Promise<void>
  verifyOtp: (email: string, token: string) => Promise<void>
  resetOtp: () => void
  signOut: () => Promise<void>
}

export const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSendingOtp, setIsSendingOtp] = useState(false)
  const [isVerifying, setIsVerifying] = useState(false)
  const [otpSent, setOtpSent] = useState(false)

  useEffect(() => {
    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      setIsLoading(false)
    })

    // Listen for auth state changes
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })

    return () => {
      listener.subscription.unsubscribe()
    }
  }, [])

  const signIn = useCallback(async (email: string) => {
    setIsSendingOtp(true)
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: true,
      },
    })
    setIsSendingOtp(false)
    if (error) throw error
    setOtpSent(true)
  }, [])

  const verifyOtp = useCallback(async (email: string, token: string) => {
    setIsVerifying(true)
    const { error } = await supabase.auth.verifyOtp({
      email,
      token,
      type: 'email',
    })
    setIsVerifying(false)
    if (error) throw error
    setOtpSent(false)
  }, [])

  const resetOtp = useCallback(() => {
    setOtpSent(false)
  }, [])

  const signOut = useCallback(async () => {
    await supabase.auth.signOut()
    setOtpSent(false)
  }, [])

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isSendingOtp,
        isVerifying,
        otpSent,
        signIn,
        verifyOtp,
        resetOtp,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}
