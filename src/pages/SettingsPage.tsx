import { useAuth } from '../hooks/useAuth'
import { LogOut, User } from 'lucide-react'

export default function SettingsPage() {
  const { user, signOut } = useAuth()

  return (
    <div className="min-h-svh bg-gray-50">
      <div className="px-4 py-5 space-y-6 pb-32">
        {/* User profile */}
        <section className="bg-white rounded-2xl border border-gray-100 p-4 flex items-center gap-3">
          <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center shrink-0">
            <User className="w-6 h-6 text-green-600" />
          </div>
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
      </div>
    </div>
  )
}
