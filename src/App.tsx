import { BrowserRouter, Routes, Route, Navigate, useLocation, NavLink, useNavigate, useNavigationType } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider } from './contexts/AuthContext'
import { useAuth } from './hooks/useAuth'
import LoginPage from './pages/LoginPage'
import HomePage from './pages/HomePage'
import PlayersPage from './pages/PlayersPage'
import SessionsListPage from './pages/SessionsListPage'
import CreateSessionPage from './pages/CreateSessionPage'
import SessionDetailPage from './pages/SessionDetailPage'
import SessionMatchPlayersPage from './pages/SessionMatchPlayersPage'
import SessionMatchResultPage from './pages/SessionMatchResultPage'
import EditMatchPage from './pages/EditMatchPage'
import SettingsPage from './pages/SettingsPage'
import DesignSystemPage from './pages/DesignSystemPage'
import SessionDonatedListPage from './pages/SessionDonatedListPage'

import { useOpenSession } from './hooks/useSessions'
import { Home, Users, Trophy, Settings, ArrowLeft } from 'lucide-react'
import './index.css'
import { useEffect } from 'react'

const IS_DEV = import.meta.env.DEV

const TAB_ROUTES = ['/', '/players', '/sessions', '/settings']

const queryClient = new QueryClient()

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth()
  const location = useLocation()

  if (isLoading) {
    return (
      <div className="min-h-svh flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-green-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  return <>{children}</>
}

const PAGE_TITLES: Record<string, string> = {
  '/': 'Home',
  '/players': 'Players',
  '/sessions': 'Sessions',
  '/sessions/new': 'New Session',
  '/settings': 'Settings',
  '/settings/design-system': 'Design System',
}

function getPageTitle(path: string): string {
  if (PAGE_TITLES[path]) return PAGE_TITLES[path]
  if (path.startsWith('/sessions/') && path.endsWith('/matches/new')) return 'Select Players'
  if (path.startsWith('/sessions/') && path.endsWith('/matches/new/result')) return 'Final Result'
  if (path.includes('/matches/') && path.endsWith('/edit')) return 'Edit Match'
  if (path.startsWith('/sessions/') && path.endsWith('/donated')) return 'Donated'
  if (path.startsWith('/sessions/')) return 'Session Detail'
  return ''
}

function getSessionIdFromPath(path: string): string | null {
  const m = path.match(/^\/sessions\/([^/]+)/)
  return m ? m[1] : null
}

function isSelectPlayerPage(path: string): boolean {
  return /^\/sessions\/[^/]+\/matches\/new$/.test(path)
}

function AppBar() {
  const location = useLocation()
  const navigate = useNavigate()
  const navType = useNavigationType()
  const title = getPageTitle(location.pathname)
  const showBack = !TAB_ROUTES.includes(location.pathname)

  if (location.pathname === '/login') return null
  if (TAB_ROUTES.includes(location.pathname)) return null

  function handleBack() {
    const path = location.pathname

    // 1. Final Result -> Select Players
    if (path.endsWith('/matches/new/result')) {
      const sid = getSessionIdFromPath(path)
      if (sid) {
        navigate(`/sessions/${sid}/matches/new`, { replace: true })
        return
      }
    }

    // 2. Select Players -> Session Detail
    if (isSelectPlayerPage(path)) {
      const sid = getSessionIdFromPath(path)
      if (sid) {
        navigate(`/sessions/${sid}`, { replace: true })
        return
      }
    }

    // 3. Session Detail -> return to where it opened from
    const sessionDetailMatch = path.match(/^\/sessions\/[^/]+$/)
    if (sessionDetailMatch) {
      const from = location.state?.from as string | undefined
      if (from && TAB_ROUTES.includes(from)) {
        navigate(from, { replace: true })
        return
      }
    }

    // Default: browser back
    if (navType === 'POP') {
      navigate('/')
    } else {
      navigate(-1)
    }
  }

  return (
    <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-xl border-b border-gray-100">
      <div className="flex items-center gap-2 px-4 h-12">
        {showBack && (
          <button
            onClick={handleBack}
            className="p-2 -ml-2 rounded-full active:bg-gray-100 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
        )}
        <h1 className="text-[17px] font-bold text-gray-900">{title}</h1>
      </div>
    </header>
  )
}

function ActiveSessionRedirect() {
  const navigate = useNavigate()
  const { data: session, isLoading } = useOpenSession()

  useEffect(() => {
    if (!isLoading) {
      if (session) {
        navigate(`/sessions/${session.id}`, { replace: true })
      } else {
        navigate('/sessions/new', { replace: true })
      }
    }
  }, [session, isLoading, navigate])

  return (
    <div className="min-h-svh flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-green-600 border-t-transparent rounded-full animate-spin" />
    </div>
  )
}

function AppLayout({ children }: { children: React.ReactNode }) {
  const location = useLocation()
  const isLogin = location.pathname === '/login'

  return (
    <div className="min-h-svh bg-gray-50 max-w-lg mx-auto relative">
      {!isLogin && <AppBar />}
      <main>{children}</main>
      {!isLogin && (
        <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 max-w-lg mx-auto z-40">
          <div className="flex items-center justify-around py-2 pb-[env(safe-area-inset-bottom)]">
            <NavButton to="/" icon={<Home className="w-5 h-5" />} label="Home" />
            <NavButton to="/sessions" icon={<Trophy className="w-5 h-5" />} label="Sessions" />
            <NavButton to="/players" icon={<Users className="w-5 h-5" />} label="Players" />
            <NavButton to="/settings" icon={<Settings className="w-5 h-5" />} label="Settings" />
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
        `flex flex-col items-center gap-0.5 px-4 py-1.5 rounded-lg transition-colors ${
          isActive ? 'text-green-600' : 'text-gray-400'
        }`
      }
    >
      {icon}
      <span className="text-[10px] font-medium">{label}</span>
    </NavLink>
  )
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/"
        element={
          <RequireAuth>
            <HomePage />
          </RequireAuth>
        }
      />
      <Route
        path="/players"
        element={
          <RequireAuth>
            <PlayersPage />
          </RequireAuth>
        }
      />
      <Route
        path="/sessions"
        element={
          <RequireAuth>
            <SessionsListPage />
          </RequireAuth>
        }
      />
      <Route
        path="/sessions/active"
        element={
          <RequireAuth>
            <ActiveSessionRedirect />
          </RequireAuth>
        }
      />
      <Route
        path="/sessions/new"
        element={
          <RequireAuth>
            <CreateSessionPage />
          </RequireAuth>
        }
      />
      <Route
        path="/sessions/:id"
        element={
          <RequireAuth>
            <SessionDetailPage />
          </RequireAuth>
        }
      />
      <Route
        path="/sessions/:id/matches/new"
        element={
          <RequireAuth>
            <SessionMatchPlayersPage />
          </RequireAuth>
        }
      />
      <Route
        path="/sessions/:id/matches/new/result"
        element={
          <RequireAuth>
            <SessionMatchResultPage />
          </RequireAuth>
        }
      />
      <Route
        path="/sessions/:id/matches/:matchId/edit"
        element={
          <RequireAuth>
            <EditMatchPage />
          </RequireAuth>
        }
      />
      <Route
        path="/sessions/:id/donated"
        element={
          <RequireAuth>
            <SessionDonatedListPage />
          </RequireAuth>
        }
      />
      <Route
        path="/settings"
        element={
          <RequireAuth>
            <SettingsPage />
          </RequireAuth>
        }
      />
      {IS_DEV && (
        <Route
          path="/settings/design-system"
          element={
            <RequireAuth>
              <DesignSystemPage />
            </RequireAuth>
          }
        />
      )}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <AppLayout>
            <AppRoutes />
          </AppLayout>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  )
}

export default App
