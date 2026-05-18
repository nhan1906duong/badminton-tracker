import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useClearAllData } from '../hooks/useSessions'
import { LogOut, Trash2, AlertTriangle, Palette, ChevronRight } from 'lucide-react'
import Avatar from '../components/Avatar'

const IS_DEV = import.meta.env.DEV

export default function SettingsPage() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const clearAll = useClearAllData()
  const [confirming, setConfirming] = useState(false)

  const handleClear = () => {
    if (!confirming) {
      setConfirming(true)
      return
    }
    clearAll.mutate(undefined, {
      onSuccess: () => setConfirming(false),
    })
  }

  return (
    <div className="min-h-svh bg-gray-50">
      <div className="px-4 py-5 space-y-6 pb-32">
        {/* User profile */}
        <section className="bg-white rounded-2xl border border-gray-100 p-4 flex items-center gap-3">
          <Avatar
            name={user?.email || 'User'}
            size={48}
            bgColor="#dcfce7"
            textColor="#16a34a"
          />
          <div className="flex-1 min-w-0">
            <p className="text-[15px] font-bold text-gray-900 truncate">
              {user?.email || 'User'}
            </p>
            <p className="text-xs text-gray-400">Signed in</p>
          </div>
        </section>

        {/* Actions */}
        <section className="space-y-2">
          <button
            onClick={() => signOut()}
            className="w-full flex items-center gap-3 px-4 py-4 bg-white rounded-2xl border border-gray-100 text-red-600 active:bg-red-50 transition-colors"
          >
            <LogOut className="w-5 h-5" />
            <span className="text-[15px] font-semibold">Log Out</span>
          </button>
        </section>

        {/* Dev-only: Clear all data */}
        {IS_DEV && (
          <section className="space-y-2">
            <div className="flex items-center gap-2 px-1">
              <span className="text-xs font-bold uppercase tracking-wider text-amber-600 bg-amber-100 px-2 py-0.5 rounded">
                Dev Only
              </span>
            </div>
            <button
              onClick={() => navigate('/settings/design-system')}
              className="w-full flex items-center gap-3 px-4 py-4 bg-white rounded-2xl border border-gray-100 text-gray-700 active:bg-gray-50 transition-colors"
            >
              <Palette className="w-5 h-5 shrink-0" />
              <span className="flex-1 text-left text-[15px] font-semibold">Design System</span>
              <ChevronRight className="w-5 h-5 text-gray-300 shrink-0" />
            </button>
            <button
              onClick={handleClear}
              disabled={clearAll.isPending}
              className={`w-full flex items-center gap-3 px-4 py-4 bg-white rounded-2xl border transition-colors ${
                confirming
                  ? 'border-red-300 text-red-700 active:bg-red-50'
                  : 'border-gray-100 text-gray-700 active:bg-gray-50'
              }`}
            >
              {confirming ? (
                <AlertTriangle className="w-5 h-5 text-red-600 shrink-0" />
              ) : (
                <Trash2 className="w-5 h-5 shrink-0" />
              )}
              <span className="text-[15px] font-semibold">
                {clearAll.isPending
                  ? 'Clearing...'
                  : confirming
                    ? 'Tap again to confirm clear all'
                    : 'Clear All Matches & Sessions'}
              </span>
            </button>
          </section>
        )}
      </div>
    </div>
  )
}
