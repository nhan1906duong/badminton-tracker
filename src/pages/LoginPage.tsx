import { useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import { Mail, KeyRound, ArrowLeft, Loader2 } from 'lucide-react'

export default function LoginPage() {
  const { signIn, verifyOtp, resetOtp, isSendingOtp, isVerifying, otpSent } = useAuth()
  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState('')
  const [error, setError] = useState('')

  async function handleSendOtp(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    try {
      await signIn(email)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send OTP')
    }
  }

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    try {
      await verifyOtp(email, otp)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid OTP')
    }
  }

  return (
    <div className="min-h-svh flex items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-lg p-6">
        <div className="text-center mb-6">
          <div className="w-14 h-14 bg-green-100 rounded-xl flex items-center justify-center mx-auto mb-3">
            <span className="text-2xl">🏸</span>
          </div>
          <h1 className="text-xl font-bold text-gray-900">Badminton Tracker</h1>
          <p className="text-sm text-gray-500 mt-1">Sign in to track matches</p>
        </div>

        {!otpSent ? (
          <form onSubmit={handleSendOtp} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  className="w-full pl-10 pr-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={isSendingOtp}
              className="w-full py-2.5 bg-green-600 text-white rounded-xl text-sm font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isSendingOtp ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
              {isSendingOtp ? 'Sending...' : 'Send Magic Link'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerify} className="space-y-4">
            <button
              type="button"
              onClick={() => resetOtp()}
              className="text-sm text-gray-500 flex items-center gap-1 hover:text-gray-700"
            >
              <ArrowLeft className="w-3 h-3" />
              Back
            </button>
            <p className="text-sm text-gray-600">
              Enter the 6-digit code sent to <strong>{email}</strong>
            </p>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Verification Code</label>
              <div className="relative">
                <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={otp}
                  onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="123456"
                  maxLength={6}
                  required
                  className="w-full pl-10 pr-3 py-2.5 border border-gray-200 rounded-xl text-sm tracking-widest text-center focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={isVerifying || otp.length < 6}
              className="w-full py-2.5 bg-green-600 text-white rounded-xl text-sm font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isVerifying ? <Loader2 className="w-4 h-4 animate-spin" /> : <KeyRound className="w-4 h-4" />}
              {isVerifying ? 'Verifying...' : 'Verify'}
            </button>
          </form>
        )}

        {error && (
          <p className="mt-3 text-sm text-red-600 text-center">{error}</p>
        )}
      </div>
    </div>
  )
}
