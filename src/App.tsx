import { BrowserRouter, Routes, Route, Navigate, useLocation, NavLink } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider } from './contexts/AuthContext'
import { useAuth } from './hooks/useAuth'
import LoginPage from './pages/LoginPage'
import HomePage from './pages/HomePage'
import PlayersPage from './pages/PlayersPage'
import NewMatchPage from './pages/NewMatchPage'
import { Home, Users, Trophy } from 'lucide-react'
import './index.css'

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

function AppLayout({ children }: { children: React.ReactNode }) {
  const location = useLocation()
  const isLogin = location.pathname === '/login'

  return (
    <div className="min-h-svh bg-gray-50 max-w-lg mx-auto relative">
      {!isLogin && (
        <header className="sticky top-0 z-40 bg-green-600 text-white px-4 py-3 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xl">🏸</span>
              <h1 className="text-base font-bold">Badminton Tracker</h1>
            </div>
          </div>
        </header>
      )}

      <main>{children}</main>

      {!isLogin && (
        <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 max-w-lg mx-auto z-40">
          <div className="flex items-center justify-around py-2">
            <NavButton to="/" icon={<Home className="w-5 h-5" />} label="Home" />
            <NavButton to="/matches/new" icon={<Trophy className="w-5 h-5" />} label="Match" />
            <NavButton to="/players" icon={<Users className="w-5 h-5" />} label="Players" />
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
        path="/matches/new"
        element={
          <RequireAuth>
            <NewMatchPage />
          </RequireAuth>
        }
      />
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
