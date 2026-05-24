import { BrowserRouter, useLocation, NavLink } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider } from './contexts/AuthContext'
import AnimatedRoutes from './components/AnimatedRoutes'
import { Trophy, Medal, Settings } from 'lucide-react'
import { LocaleProvider, useI18n } from './i18n'
import './index.css'

const TAB_ROUTES = ['/sessions', '/ranking', '/settings']

const queryClient = new QueryClient()

function AppLayout({ children }: { children: React.ReactNode }) {
  const location = useLocation()
  const { t } = useI18n()
  const isTabRoute = TAB_ROUTES.includes(location.pathname)

  return (
    <div
      className="min-h-dvh bg-[var(--bg)] max-w-lg mx-auto relative"
      style={{ paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <main>{children}</main>
      {isTabRoute && (
        <nav className="fixed bottom-0 left-0 right-0 bg-[var(--surface)] border-t border-[var(--border)] max-w-lg mx-auto z-40">
          <div className="flex items-center justify-around py-2 pb-[env(safe-area-inset-bottom)]">
            <NavButton to="/sessions" icon={<Trophy className="w-5 h-5" />} label={t('nav.sessions')} />
            <NavButton to="/ranking" icon={<Medal className="w-5 h-5" />} label={t('nav.ranking')} />
            <NavButton to="/settings" icon={<Settings className="w-5 h-5" />} label={t('nav.settings')} />
          </div>
        </nav>
      )}
    </div>
  )
}

function NavButton({ to, icon, label }: { to: string; icon: React.ReactNode; label: string }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `flex flex-col items-center gap-0.5 px-4 py-1.5 transition-colors ${
          isActive ? 'text-[var(--accent)]' : 'text-[var(--muted)]'
        }`
      }
    >
      {icon}
      <span className="text-[10px] font-medium">{label}</span>
    </NavLink>
  )
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <LocaleProvider>
        <BrowserRouter>
          <AuthProvider>
            <AppLayout>
              <AnimatedRoutes />
            </AppLayout>
          </AuthProvider>
        </BrowserRouter>
      </LocaleProvider>
    </QueryClientProvider>
  )
}

export default App
