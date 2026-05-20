import { type ReactNode } from 'react'
import { render as rtlRender, type RenderOptions } from '@testing-library/react'
import { MemoryRouter, Routes, Route, type MemoryRouterProps } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthContext, type AuthContextValue } from '../contexts/AuthContext'

const defaultQueryClient = new QueryClient({
  defaultOptions: { queries: { retry: false } },
})

function createMockAuth(partial: Partial<AuthContextValue> = {}): AuthContextValue {
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

interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  routerProps?: MemoryRouterProps
  auth?: Partial<AuthContextValue>
}

export function renderWithRouter(
  ui: ReactNode,
  { routerProps, auth, ...options }: CustomRenderOptions = {}
) {
  const mockAuth = createMockAuth(auth)

  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={defaultQueryClient}>
        <AuthContext.Provider value={mockAuth}>
          <MemoryRouter {...routerProps}>{children}</MemoryRouter>
        </AuthContext.Provider>
      </QueryClientProvider>
    )
  }

  return {
    ...rtlRender(ui, { wrapper: Wrapper, ...options }),
    mockAuth,
  }
}

export function renderRoute(
  path: string,
  {
    initialEntries = [path],
    auth,
    ...options
  }: CustomRenderOptions & { initialEntries?: string[] } = {}
) {
  return renderWithRouter(
    <Routes>
      <Route path="/login" element={<div data-testid="login-page">Login</div>} />
      <Route path="/" element={<div data-testid="home-page">Home</div>} />
      <Route path="/players" element={<div data-testid="players-page">Players</div>} />
      <Route path="/sessions" element={<div data-testid="sessions-page">Sessions</div>} />
      <Route path="/settings" element={<div data-testid="settings-page">Settings</div>} />
      <Route path="/sessions/new" element={<div data-testid="create-session">New Session</div>} />
      <Route path="/sessions/:id" element={<div data-testid="session-detail">Session Detail</div>} />
      <Route path="/sessions/:id/donated" element={<div data-testid="donated-list">Donated</div>} />
      <Route path="/sessions/:id/matches/new" element={<div data-testid="match-players">Select Players</div>} />
      <Route path="/sessions/:id/matches/new/result" element={<div data-testid="match-result">Final Result</div>} />
      <Route path="/sessions/:id/matches/:matchId/edit" element={<div data-testid="edit-match">Edit Match</div>} />
    </Routes>,
    {
      routerProps: { initialEntries },
      auth,
      ...options,
    }
  )
}
