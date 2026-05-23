import { useReducer, useEffect, useRef } from 'react'
import { Routes, Route, Navigate, useLocation, useNavigationType } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import LoginPage from '../pages/LoginPage'
import PlayersPage from '../pages/PlayersPage'
import SessionsListPage from '../pages/SessionsListPage'
import CreateSessionPage from '../pages/CreateSessionPage'
import SessionDetailPage from '../pages/SessionDetailPage'
import SessionStatsPage from '../pages/SessionStatsPage'
import CreateMatchPage from '../pages/CreateMatchPage'
import EditMatchPage from '../pages/EditMatchPage'
import MatchDetailPage from '../pages/MatchDetailPage'
import SettingsPage from '../pages/SettingsPage'
import DesignSystemPage from '../pages/DesignSystemPage'
import SessionDonatedListPage from '../pages/SessionDonatedListPage'
import PlayerDetailPage from '../pages/PlayerDetailPage'
import RankingPage from '../pages/RankingPage'
import { useOpenSession } from '../hooks/useSessions'
import { useNavigate } from 'react-router-dom'

const IS_DEV = import.meta.env.DEV
const TAB_ROUTES = ['/', '/sessions', '/ranking', '/settings']

type TransitionDirection = 'forward' | 'backward' | null
type TransitionStage = 'idle' | 'entering'

interface TransitionState {
  stage: TransitionStage
  displayPath: string
  direction: TransitionDirection
}

type TransitionAction =
  | { type: 'instant'; path: string }
  | { type: 'enter'; direction: TransitionDirection; path: string }
  | { type: 'done' }

function transitionReducer(state: TransitionState, action: TransitionAction): TransitionState {
  switch (action.type) {
    case 'instant':
      return { stage: 'idle', displayPath: action.path, direction: null }
    case 'enter':
      return { stage: 'entering', displayPath: action.path, direction: action.direction }
    case 'done':
      return { ...state, stage: 'idle', direction: null }
    default:
      return state
  }
}

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

const routes = [
  { path: '/login', element: <LoginPage />, auth: false },
  { path: '/', element: <Navigate to="/sessions" replace />, auth: true },
  { path: '/players', element: <PlayersPage />, auth: true },
  { path: '/sessions', element: <SessionsListPage />, auth: true },
  { path: '/sessions/active', element: <ActiveSessionRedirect />, auth: true },
  { path: '/sessions/new', element: <CreateSessionPage />, auth: true },
  { path: '/sessions/:id', element: <SessionDetailPage />, auth: true },
  { path: '/sessions/:id/stats', element: <SessionStatsPage />, auth: true },
  { path: '/sessions/:id/matches/new', element: <CreateMatchPage />, auth: true },
  { path: '/sessions/:id/matches/:matchId', element: <MatchDetailPage />, auth: true },
  { path: '/sessions/:id/matches/:matchId/edit', element: <EditMatchPage />, auth: true },
  { path: '/sessions/:id/donated', element: <SessionDonatedListPage />, auth: true },
  { path: '/players/:playerId', element: <PlayerDetailPage />, auth: true },
  { path: '/ranking', element: <RankingPage />, auth: true },
  { path: '/settings', element: <SettingsPage />, auth: true },
  ...(IS_DEV ? [{ path: '/settings/design-system', element: <DesignSystemPage />, auth: true }] : []),
  { path: '*', element: <Navigate to="/" replace />, auth: false },
]

function RouteList() {
  return (
    <Routes>
      {routes.map((r) => (
        <Route
          key={r.path}
          path={r.path}
          element={
            r.auth ? (
              <RequireAuth>{r.element}</RequireAuth>
            ) : (
              r.element
            )
          }
        />
      ))}
    </Routes>
  )
}

export default function AnimatedRoutes() {
  const location = useLocation()
  const navType = useNavigationType()

  const [transition, dispatch] = useReducer(transitionReducer, {
    stage: 'idle',
    displayPath: location.pathname,
    direction: null,
  })

  const prevPathRef = useRef(location.pathname)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const currentPath = location.pathname
    const prevPath = prevPathRef.current

    if (currentPath === prevPath) return

    const isCurrentTab = TAB_ROUTES.includes(currentPath)
    const isPrevTab = TAB_ROUTES.includes(prevPath)

    let direction: TransitionDirection = null
    if (!(isCurrentTab && isPrevTab) && navType !== 'REPLACE') {
      if (navType === 'PUSH') direction = 'forward'
      else if (navType === 'POP') direction = 'backward'
    }

    prevPathRef.current = currentPath

    if (!direction) {
      queueMicrotask(() => {
        dispatch({ type: 'instant', path: currentPath })
      })
      return undefined
    }

    queueMicrotask(() => {
      dispatch({ type: 'enter', direction, path: currentPath })
    })

    timerRef.current = setTimeout(() => {
      queueMicrotask(() => {
        dispatch({ type: 'done' })
      })
    }, 300)

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [location.pathname, navType])

  const isAnimating = transition.stage === 'entering'
  const isForward = transition.direction === 'forward'

  const animationClass = isForward ? 'page-enter-right' : 'page-enter-left'

  return (
    <div className={isAnimating ? 'overflow-hidden' : undefined}>
      <div className={isAnimating ? animationClass : undefined}>
        <RouteList />
      </div>
    </div>
  )
}
