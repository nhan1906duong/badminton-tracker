import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter, type MemoryRouterProps } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthContext, type AuthContextValue } from '../../contexts/AuthContext'
import LoginPage from '../LoginPage'

// ------------------------------------------------------------------
// Mocks
// ------------------------------------------------------------------

const mockNavigate = vi.fn()

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom')
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  }
})

// ------------------------------------------------------------------
// Test helpers
// ------------------------------------------------------------------

function createAuthValue(partial: Partial<AuthContextValue> = {}): AuthContextValue {
  return {
    user: null,
    isLoading: false,
    isSigningIn: false,
    signInWithPassword: vi.fn(),
    signOut: vi.fn(),
    ...partial,
  }
}

const testQueryClient = new QueryClient({
  defaultOptions: { queries: { retry: false } },
})

function renderLoginPage(
  authValue: AuthContextValue,
  initialEntries: MemoryRouterProps['initialEntries'] = ['/login'],
) {
  return render(
    <QueryClientProvider client={testQueryClient}>
      <AuthContext.Provider value={authValue}>
        <MemoryRouter initialEntries={initialEntries}>
          <LoginPage />
        </MemoryRouter>
      </AuthContext.Provider>
    </QueryClientProvider>
  )
}

// ------------------------------------------------------------------
// Tests
// ------------------------------------------------------------------

describe('LoginPage', () => {
  beforeEach(() => {
    mockNavigate.mockClear()
  })

  it('renders email and password fields', () => {
    renderLoginPage(createAuthValue())
    expect(screen.getByPlaceholderText('you@example.com')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('••••••••')).toBeInTheDocument()
  })

  it('calls signInWithPassword with email and password on submit', async () => {
    const signInWithPassword = vi.fn().mockResolvedValue(undefined)
    renderLoginPage(createAuthValue({ signInWithPassword }))

    fireEvent.change(screen.getByPlaceholderText('you@example.com'), {
      target: { value: 'test@example.com' },
    })
    fireEvent.change(screen.getByPlaceholderText('••••••••'), {
      target: { value: 'secret123' },
    })
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }))

    await waitFor(() => {
      expect(signInWithPassword).toHaveBeenCalledWith('test@example.com', 'secret123')
    })
  })

  it('navigates to / after successful sign in (no location state)', async () => {
    const signInWithPassword = vi.fn().mockResolvedValue(undefined)
    renderLoginPage(createAuthValue({ signInWithPassword }))

    fireEvent.change(screen.getByPlaceholderText('you@example.com'), {
      target: { value: 'test@example.com' },
    })
    fireEvent.change(screen.getByPlaceholderText('••••••••'), {
      target: { value: 'secret123' },
    })
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }))

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/', { replace: true })
    })
  })

  it('navigates to location.state.from after successful sign in', async () => {
    const signInWithPassword = vi.fn().mockResolvedValue(undefined)
    renderLoginPage(createAuthValue({ signInWithPassword }), [
      { pathname: '/login', state: { from: { pathname: '/sessions/abc-123' } } },
    ])

    fireEvent.change(screen.getByPlaceholderText('you@example.com'), {
      target: { value: 'test@example.com' },
    })
    fireEvent.change(screen.getByPlaceholderText('••••••••'), {
      target: { value: 'secret123' },
    })
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }))

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/sessions/abc-123', { replace: true })
    })
  })

  it('displays error message when sign in fails', async () => {
    const signInWithPassword = vi.fn().mockRejectedValue(new Error('Invalid login credentials'))
    renderLoginPage(createAuthValue({ signInWithPassword }))

    fireEvent.change(screen.getByPlaceholderText('you@example.com'), {
      target: { value: 'test@example.com' },
    })
    fireEvent.change(screen.getByPlaceholderText('••••••••'), {
      target: { value: 'wrongpassword' },
    })
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }))

    await waitFor(() => {
      expect(screen.getByText('Invalid login credentials')).toBeInTheDocument()
    })

    expect(mockNavigate).not.toHaveBeenCalled()
  })

  it('disables submit button while signing in', () => {
    renderLoginPage(createAuthValue({ isSigningIn: true }))
    expect(screen.getByRole('button', { name: /signing in/i })).toBeDisabled()
  })
})
