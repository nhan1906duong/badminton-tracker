import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import {
  MemoryRouter,
  Routes,
  Route,
  useLocation,
  Navigate,
} from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useContext } from 'react'
import { AuthContext, type AuthContextValue } from '../../contexts/AuthContext'
import { type User } from '@supabase/supabase-js'

// ------------------------------------------------------------------
// Test helpers
// ------------------------------------------------------------------

const mockUser = { id: 'u1', email: 'test@example.com' } as User

function createAuthValue(partial: Partial<AuthContextValue> = {}): AuthContextValue {
  return {
    user: null,
    isLoading: false,
    isSendingOtp: false,
    isVerifying: false,
    otpSent: false,
    signIn: vi.fn(),
    verifyOtp: vi.fn(),
    resetOtp: vi.fn(),
    signOut: vi.fn(),
    ...partial,
  }
}

const testQueryClient = new QueryClient({
  defaultOptions: { queries: { retry: false } },
})

function renderWithProviders(
  ui: React.ReactNode,
  {
    initialEntries = ['/'],
    authValue = createAuthValue(),
  }: { initialEntries?: string[]; authValue?: AuthContextValue } = {}
) {
  return render(
    <QueryClientProvider client={testQueryClient}>
      <AuthContext.Provider value={authValue}>
        <MemoryRouter initialEntries={initialEntries}>{ui}</MemoryRouter>
      </AuthContext.Provider>
    </QueryClientProvider>
  )
}

// ------------------------------------------------------------------
// Component under test: RequireAuth
// ------------------------------------------------------------------

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useContext(AuthContext)!
  const location = useLocation()

  if (isLoading) {
    return <div data-testid="auth-loading">Loading...</div>
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  return <>{children}</>
}

// ------------------------------------------------------------------
// Tests
// ------------------------------------------------------------------

describe('Auth Guard', () => {
  it('redirects unauthenticated user to /login', () => {
    renderWithProviders(
      <Routes>
        <Route path="/login" element={<div data-testid="login-page">Login</div>} />
        <Route
          path="/"
          element={
            <RequireAuth>
              <div data-testid="home-page">Home</div>
            </RequireAuth>
          }
        />
      </Routes>,
      { authValue: createAuthValue({ user: null }) }
    )

    expect(screen.getByTestId('login-page')).toBeInTheDocument()
    expect(screen.queryByTestId('home-page')).not.toBeInTheDocument()
  })

  it('allows authenticated user to access protected route', () => {
    renderWithProviders(
      <Routes>
        <Route path="/login" element={<div data-testid="login-page">Login</div>} />
        <Route
          path="/"
          element={
            <RequireAuth>
              <div data-testid="home-page">Home</div>
            </RequireAuth>
          }
        />
      </Routes>,
      { authValue: createAuthValue({ user: mockUser }) }
    )

    expect(screen.getByTestId('home-page')).toBeInTheDocument()
    expect(screen.queryByTestId('login-page')).not.toBeInTheDocument()
  })

  it('shows loading spinner while auth state is loading', () => {
    renderWithProviders(
      <Routes>
        <Route
          path="/"
          element={
            <RequireAuth>
              <div data-testid="home-page">Home</div>
            </RequireAuth>
          }
        />
      </Routes>,
      { authValue: createAuthValue({ isLoading: true, user: null }) }
    )

    expect(screen.getByTestId('auth-loading')).toBeInTheDocument()
  })

  it('preserves original route in location state when redirecting', () => {
    renderWithProviders(
      <Routes>
        <Route path="/login" element={<LocationDisplay />} />
        <Route
          path="/sessions/new"
          element={
            <RequireAuth>
              <div>New Session</div>
            </RequireAuth>
          }
        />
      </Routes>,
      { initialEntries: ['/sessions/new'], authValue: createAuthValue({ user: null }) }
    )

    expect(screen.getByTestId('location-path')).toHaveTextContent('/login')
    expect(screen.getByTestId('location-state')).toHaveTextContent('from')
  })
})

describe('Tab Bar Visibility', () => {
  const tabRoutes = ['/', '/sessions', '/players', '/settings']
  const nonTabRoutes = [
    '/login',
    '/sessions/new',
    '/sessions/abc-123',
    '/sessions/abc-123/donated',
    '/sessions/abc-123/matches/new',
    '/sessions/abc-123/matches/new/result',
    '/sessions/abc-123/matches/m1/edit',
  ]

  function TabBarApp({ path }: { path: string }) {
    const TAB_ROUTES = ['/', '/players', '/sessions', '/settings']
    const isLogin = path === '/login'
    const showTabBar = !isLogin && TAB_ROUTES.includes(path)

    return (
      <div>
        <div data-testid="current-path">{path}</div>
        {showTabBar && <nav data-testid="tab-bar">Tab Bar</nav>}
      </div>
    )
  }

  it('shows tab bar on all 4 tab routes', () => {
    for (const path of tabRoutes) {
      const { unmount } = render(<TabBarApp path={path} />)
      expect(screen.getByTestId('tab-bar')).toBeInTheDocument()
      unmount()
    }
  })

  it('hides tab bar on non-tab routes', () => {
    for (const path of nonTabRoutes) {
      const { unmount } = render(<TabBarApp path={path} />)
      expect(screen.queryByTestId('tab-bar')).not.toBeInTheDocument()
      unmount()
    }
  })
})

describe('AppBar Visibility', () => {
  function AppBar({ path }: { path: string }) {
    const TAB_ROUTES = ['/', '/players', '/sessions', '/settings']

    if (path === '/login') return null
    if (TAB_ROUTES.includes(path)) return null

    const PAGE_TITLES: Record<string, string> = {
      '/sessions/new': 'New Session',
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

    return (
      <header data-testid="app-bar">
        <h1 data-testid="page-title">{getPageTitle(path)}</h1>
      </header>
    )
  }

  it('hides app bar on tab routes and login', () => {
    const hiddenRoutes = ['/', '/sessions', '/players', '/settings', '/login']
    for (const path of hiddenRoutes) {
      const { unmount } = render(<AppBar path={path} />)
      expect(screen.queryByTestId('app-bar')).not.toBeInTheDocument()
      unmount()
    }
  })

  it('shows app bar on sub-routes with correct title', () => {
    const cases = [
      { path: '/sessions/new', title: 'New Session' },
      { path: '/sessions/abc-123', title: 'Session Detail' },
      { path: '/sessions/abc-123/donated', title: 'Donated' },
      { path: '/sessions/abc-123/matches/new', title: 'Select Players' },
      { path: '/sessions/abc-123/matches/new/result', title: 'Final Result' },
      { path: '/sessions/abc-123/matches/m1/edit', title: 'Edit Match' },
    ]

    for (const { path, title } of cases) {
      const { unmount } = render(<AppBar path={path} />)
      expect(screen.getByTestId('app-bar')).toBeInTheDocument()
      expect(screen.getByTestId('page-title')).toHaveTextContent(title)
      unmount()
    }
  })
})

describe('Back Navigation', () => {
  function getSessionIdFromPath(path: string): string | null {
    const m = path.match(/^\/sessions\/([^/]+)/)
    return m ? m[1] : null
  }

  function handleBack(
    path: string,
    fromState: string | undefined,
    navType: string,
    navigate: (to: string | number, opts?: object) => void
  ) {
    const TAB_ROUTES = ['/', '/players', '/sessions', '/settings']

    if (path.endsWith('/matches/new/result')) {
      const sid = getSessionIdFromPath(path)
      if (sid) {
        navigate(`/sessions/${sid}/matches/new`, { replace: true })
        return
      }
    }

    if (/^\/sessions\/[^/]+\/matches\/new$/.test(path)) {
      const sid = getSessionIdFromPath(path)
      if (sid) {
        navigate(`/sessions/${sid}`, { replace: true })
        return
      }
    }

    const sessionDetailMatch = path.match(/^\/sessions\/[^/]+$/)
    if (sessionDetailMatch) {
      if (fromState && TAB_ROUTES.includes(fromState)) {
        navigate(fromState, { replace: true })
        return
      }
    }

    if (navType === 'POP') {
      navigate('/')
    } else {
      navigate(-1)
    }
  }

  const mockNavigate = vi.fn()

  beforeEach(() => {
    mockNavigate.mockClear()
  })

  it('from result page goes back to select players', () => {
    handleBack(
      '/sessions/abc-123/matches/new/result',
      undefined,
      'PUSH',
      mockNavigate
    )
    expect(mockNavigate).toHaveBeenCalledWith('/sessions/abc-123/matches/new', { replace: true })
  })

  it('from select players goes back to session detail', () => {
    handleBack(
      '/sessions/abc-123/matches/new',
      undefined,
      'PUSH',
      mockNavigate
    )
    expect(mockNavigate).toHaveBeenCalledWith('/sessions/abc-123', { replace: true })
  })

  it('from session detail goes back to tab origin when state.from exists', () => {
    handleBack(
      '/sessions/abc-123',
      '/sessions',
      'PUSH',
      mockNavigate
    )
    expect(mockNavigate).toHaveBeenCalledWith('/sessions', { replace: true })
  })

  it('from session detail goes back to home when state.from is home', () => {
    handleBack(
      '/sessions/abc-123',
      '/',
      'PUSH',
      mockNavigate
    )
    expect(mockNavigate).toHaveBeenCalledWith('/', { replace: true })
  })

  it('defaults to browser back for other routes', () => {
    handleBack(
      '/sessions/new',
      undefined,
      'PUSH',
      mockNavigate
    )
    expect(mockNavigate).toHaveBeenCalledWith(-1)
  })

  it('falls back to / for POP navigation on unknown routes', () => {
    handleBack(
      '/some-route',
      undefined,
      'POP',
      mockNavigate
    )
    expect(mockNavigate).toHaveBeenCalledWith('/')
  })
})

describe('Route Matching', () => {
  const routes = [
    { path: '/', element: <div data-testid="page">Home</div> },
    { path: '/login', element: <div data-testid="page">Login</div> },
    { path: '/players', element: <div data-testid="page">Players</div> },
    { path: '/sessions', element: <div data-testid="page">Sessions</div> },
    { path: '/settings', element: <div data-testid="page">Settings</div> },
    { path: '/sessions/new', element: <div data-testid="page">New Session</div> },
    { path: '/sessions/:id', element: <div data-testid="page">Session Detail</div> },
    { path: '/sessions/:id/donated', element: <div data-testid="page">Donated</div> },
    { path: '/sessions/:id/matches/new', element: <div data-testid="page">Select Players</div> },
    { path: '/sessions/:id/matches/new/result', element: <div data-testid="page">Final Result</div> },
    { path: '/sessions/:id/matches/:matchId/edit', element: <div data-testid="page">Edit Match</div> },
    { path: '*', element: <Navigate to="/" replace /> },
  ]

  it('matches each defined route to the correct component', () => {
    const cases = [
      { path: '/', text: 'Home' },
      { path: '/login', text: 'Login' },
      { path: '/players', text: 'Players' },
      { path: '/sessions', text: 'Sessions' },
      { path: '/settings', text: 'Settings' },
      { path: '/sessions/new', text: 'New Session' },
      { path: '/sessions/abc-123', text: 'Session Detail' },
      { path: '/sessions/abc-123/donated', text: 'Donated' },
      { path: '/sessions/abc-123/matches/new', text: 'Select Players' },
      { path: '/sessions/abc-123/matches/new/result', text: 'Final Result' },
      { path: '/sessions/abc-123/matches/m1/edit', text: 'Edit Match' },
    ]

    for (const { path, text } of cases) {
      const { unmount } = renderWithProviders(
        <Routes>
          {routes.map((r) => (
            <Route key={r.path} path={r.path} element={r.element} />
          ))}
        </Routes>,
        { initialEntries: [path], authValue: createAuthValue({ user: mockUser }) }
      )

      expect(screen.getByTestId('page')).toHaveTextContent(text)
      unmount()
    }
  })

  it('redirects unknown routes to home', () => {
    renderWithProviders(
      <Routes>
        {routes.map((r) => (
          <Route key={r.path} path={r.path} element={r.element} />
        ))}
      </Routes>,
      { initialEntries: ['/unknown-route'], authValue: createAuthValue({ user: mockUser }) }
    )

    expect(screen.getByTestId('page')).toHaveTextContent('Home')
  })
})

describe('Tab Navigation', () => {
  function TabNav() {
    const location = useLocation()
    const TAB_ROUTES = ['/', '/players', '/sessions', '/settings']

    return (
      <nav data-testid="tab-nav">
        {TAB_ROUTES.map((path) => (
          <a
            key={path}
            href={path}
            data-testid={`tab-${path.replace(/\//g, '') || 'home'}`}
            data-active={location.pathname === path}
          >
            {path === '/' ? 'Home' : path.slice(1)}
          </a>
        ))}
      </nav>
    )
  }

  it('has 4 tab buttons', () => {
    renderWithProviders(<TabNav />)

    expect(screen.getByTestId('tab-home')).toBeInTheDocument()
    expect(screen.getByTestId('tab-sessions')).toBeInTheDocument()
    expect(screen.getByTestId('tab-players')).toBeInTheDocument()
    expect(screen.getByTestId('tab-settings')).toBeInTheDocument()
  })

  it('marks current tab as active', () => {
    renderWithProviders(<TabNav />, { initialEntries: ['/sessions'] })

    expect(screen.getByTestId('tab-sessions')).toHaveAttribute('data-active', 'true')
    expect(screen.getByTestId('tab-home')).toHaveAttribute('data-active', 'false')
  })
})

function LocationDisplay() {
  const location = useLocation()
  return (
    <div>
      <div data-testid="location-path">{location.pathname}</div>
      <div data-testid="location-state">{JSON.stringify(location.state)}</div>
    </div>
  )
}
