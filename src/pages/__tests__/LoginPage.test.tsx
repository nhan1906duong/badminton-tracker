import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
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

function renderLoginPage(
  authValue: AuthContextValue,
  initialEntries: string[] = ['/login'],
) {
  return render(
    <QueryClientProvider client={testQueryClient}>
      <AuthContext.Provider value={authValue}>
        <MemoryRouter initialEntries={initialEntries}>{<LoginPage />}</MemoryRouter>
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

  describe('email form', () => {
    it('submits email and calls signIn', async () => {
      const signIn = vi.fn().mockResolvedValue(undefined)
      const authValue = createAuthValue({ signIn, otpSent: false })

      renderLoginPage(authValue)

      fireEvent.change(screen.getByPlaceholderText('you@example.com'), {
        target: { value: 'test@example.com' },
      })
      fireEvent.click(screen.getByRole('button', { name: /send magic link/i }))

      await waitFor(() => {
        expect(signIn).toHaveBeenCalledWith('test@example.com')
      })
    })

    it('displays error when signIn fails', async () => {
      const signIn = vi.fn().mockRejectedValue(new Error('Network error'))
      const authValue = createAuthValue({ signIn, otpSent: false })

      renderLoginPage(authValue)

      fireEvent.change(screen.getByPlaceholderText('you@example.com'), {
        target: { value: 'test@example.com' },
      })
      fireEvent.click(screen.getByRole('button', { name: /send magic link/i }))

      await waitFor(() => {
        expect(screen.getByText('Network error')).toBeInTheDocument()
      })
    })
  })

  describe('OTP verification + redirect', () => {
    it('navigates to original page after successful OTP verification', async () => {
      const verifyOtp = vi.fn().mockResolvedValue(undefined)
      const signIn = vi.fn().mockResolvedValue(undefined)
      const authValue = createAuthValue({ signIn, verifyOtp, otpSent: false })

      // Start from a protected route that redirected to login
      const { rerender } = renderLoginPage(authValue, ['/login'])

      // Step 1: enter email and submit
      fireEvent.change(screen.getByPlaceholderText('you@example.com'), {
        target: { value: 'test@example.com' },
      })
      fireEvent.click(screen.getByRole('button', { name: /send magic link/i }))

      await waitFor(() => expect(signIn).toHaveBeenCalled())

      // Step 2: simulate auth context updating to otpSent=true
      rerender(
        <QueryClientProvider client={testQueryClient}>
          <AuthContext.Provider
            value={{ ...authValue, otpSent: true }}
          >
            <MemoryRouter
              initialEntries={['/login']}
              initialIndex={0}
            >
              {<LoginPage />}
            </MemoryRouter>
          </AuthContext.Provider>
        </QueryClientProvider>
      )

      // Step 3: enter OTP and verify
      fireEvent.change(screen.getByPlaceholderText('12345678'), {
        target: { value: '12345678' },
      })
      fireEvent.click(screen.getByRole('button', { name: /^verify$/i }))

      await waitFor(() => {
        expect(verifyOtp).toHaveBeenCalledWith('test@example.com', '12345678')
      })

      // The navigate call happens but since we're using MemoryRouter with mock,
      // we verify the mock was called with the fallback '/' since no location.state exists
      expect(mockNavigate).toHaveBeenCalledWith('/', { replace: true })
    })

    it('navigates to original page from location.state after successful OTP', async () => {
      const verifyOtp = vi.fn().mockResolvedValue(undefined)
      const signIn = vi.fn().mockResolvedValue(undefined)
      const authValue = createAuthValue({ signIn, verifyOtp, otpSent: false })

      // Render with location state simulating RequireAuth redirect
      const { rerender } = render(
        <QueryClientProvider client={testQueryClient}>
          <AuthContext.Provider value={authValue}>
            <MemoryRouter
              initialEntries={[
                { pathname: '/login', state: { from: { pathname: '/sessions/abc-123' } } },
              ]}
            >
              <LoginPage />
            </MemoryRouter>
          </AuthContext.Provider>
        </QueryClientProvider>
      )

      // Step 1: enter email
      fireEvent.change(screen.getByPlaceholderText('you@example.com'), {
        target: { value: 'test@example.com' },
      })
      fireEvent.click(screen.getByRole('button', { name: /send magic link/i }))

      await waitFor(() => expect(signIn).toHaveBeenCalled())

      // Step 2: rerender with otpSent=true
      rerender(
        <QueryClientProvider client={testQueryClient}>
          <AuthContext.Provider value={{ ...authValue, otpSent: true }}>
            <MemoryRouter
              initialEntries={[
                { pathname: '/login', state: { from: { pathname: '/sessions/abc-123' } } },
              ]}
              initialIndex={0}
            >
              <LoginPage />
            </MemoryRouter>
          </AuthContext.Provider>
        </QueryClientProvider>
      )

      // Step 3: verify OTP
      fireEvent.change(screen.getByPlaceholderText('12345678'), {
        target: { value: '12345678' },
      })
      fireEvent.click(screen.getByRole('button', { name: /^verify$/i }))

      await waitFor(() => {
        expect(verifyOtp).toHaveBeenCalledWith('test@example.com', '12345678')
      })

      expect(mockNavigate).toHaveBeenCalledWith('/sessions/abc-123', { replace: true })
    })

    it('shows error and does not navigate when OTP verification fails', async () => {
      const verifyOtp = vi.fn().mockRejectedValue(new Error('Invalid code'))
      const authValue = createAuthValue({ verifyOtp, otpSent: true })

      renderLoginPage(authValue)

      fireEvent.change(screen.getByPlaceholderText('12345678'), {
        target: { value: '12345678' },
      })
      fireEvent.click(screen.getByRole('button', { name: /^verify$/i }))

      await waitFor(() => {
        expect(screen.getByText('Invalid code')).toBeInTheDocument()
      })

      expect(mockNavigate).not.toHaveBeenCalled()
    })

    it('disables verify button when OTP is shorter than 8 digits', () => {
      const authValue = createAuthValue({ otpSent: true })

      renderLoginPage(authValue)

      const verifyBtn = screen.getByRole('button', { name: /^verify$/i })
      expect(verifyBtn).toBeDisabled()

      fireEvent.change(screen.getByPlaceholderText('12345678'), {
        target: { value: '123' },
      })

      expect(verifyBtn).toBeDisabled()
    })

    it('enables verify button when OTP is 8 digits', () => {
      const authValue = createAuthValue({ otpSent: true })

      renderLoginPage(authValue)

      fireEvent.change(screen.getByPlaceholderText('12345678'), {
        target: { value: '12345678' },
      })

      expect(screen.getByRole('button', { name: /^verify$/i })).not.toBeDisabled()
    })
  })
})
