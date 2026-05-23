import { BrowserRouter, useLocation, NavLink } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider } from './contexts/AuthContext'
import AnimatedRoutes from './components/AnimatedRoutes'
import { Home, Users, Trophy, Settings } from 'lucide-react'
import './index.css'

const FULL_SCREEN_ROUTES = ['/sessions/new']

const queryClient = new QueryClient()

function AppLayout({ children }: { children: React.ReactNode }) {
  const location = useLocation()
  const isLogin = location.pathname === '/login'
  const isFullScreen = FULL_SCREEN_ROUTES.includes(location.pathname)

  return (
    <div className="min-h-svh bg-gray-50 max-w-lg mx-auto relative">
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
