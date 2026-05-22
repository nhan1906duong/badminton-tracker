import { BrowserRouter, useLocation, NavLink, useNavigate, useNavigationType } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider } from './contexts/AuthContext'
import AnimatedRoutes from './components/AnimatedRoutes'
import { Home, Users, Trophy, Settings, ArrowLeft } from 'lucide-react'
import './index.css'

const TAB_ROUTES = ['/', '/players', '/sessions', '/settings']
const FULL_SCREEN_ROUTES = ['/sessions/new']

const queryClient = new QueryClient()

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
  if (path.startsWith('/players/') && path !== '/players') return 'Player Detail'
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
  if (FULL_SCREEN_ROUTES.includes(location.pathname)) return null

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

function AppLayout({ children }: { children: React.ReactNode }) {
  const location = useLocation()
  const isLogin = location.pathname === '/login'
  const isFullScreen = FULL_SCREEN_ROUTES.includes(location.pathname)

  return (
    <div className="min-h-svh bg-gray-50 max-w-lg mx-auto relative">
      {!isLogin && <AppBar />}
      <main>{children}</main>
      {!isLogin && !isFullScreen && (
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

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <AppLayout>
            <AnimatedRoutes />
          </AppLayout>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  )
}

export default App
