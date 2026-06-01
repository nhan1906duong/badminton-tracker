import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { SessionAttendancePanel } from '../SessionAttendancePanel'
import type { Player, SessionAttendance } from '../../types/database'

const PLAYERS: Player[] = [
  { id: 'p1', name: 'Alice Smith', rating: 1000, created_by: 'user-1', created_at: '2026-01-01T00:00:00Z' },
  { id: 'p2', name: 'Bob Jones', rating: 1000, created_by: 'user-1', created_at: '2026-01-01T00:00:00Z' },
  { id: 'p3', name: 'Carol Davis', rating: 1000, created_by: 'user-1', created_at: '2026-01-01T00:00:00Z' },
]

let mockAttendances: SessionAttendance[] = []
let mockProfilePlayerId: string | null = 'p1'
let mockIsAdmin = false
const mockUpsert = { mutate: vi.fn(), isPending: false }
const mockDelete = { mutate: vi.fn(), isPending: false }

vi.mock('../../hooks/useAuth', () => ({
  useAuth: () => ({ user: { id: 'user-1', email: 'user@example.com' } }),
}))

vi.mock('../../hooks/useProfile', () => ({
  useProfile: () => ({ data: { id: 'user-1', role: 'user', player_id: mockProfilePlayerId } }),
}))

vi.mock('../../hooks/useIsAdmin', () => ({
  useIsAdmin: () => mockIsAdmin,
}))

vi.mock('../../hooks/usePlayers', () => ({
  usePlayers: () => ({ data: PLAYERS }),
}))

vi.mock('../../hooks/useSessionAttendances', () => ({
  useSessionAttendances: () => ({ data: mockAttendances }),
  useUpsertAttendance: () => mockUpsert,
  useDeleteAttendance: () => mockDelete,
}))

function attendance(playerId: string, status: SessionAttendance['status']): SessionAttendance {
  return {
    id: `att-${playerId}`,
    session_id: 'sess-1',
    player_id: playerId,
    status,
    created_at: '2026-06-01T12:00:00Z',
    updated_at: '2026-06-01T12:00:00Z',
    created_by: 'user-1',
  }
}

describe('SessionAttendancePanel', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockAttendances = []
    mockProfilePlayerId = 'p1'
    mockIsAdmin = false
    mockUpsert.isPending = false
    mockDelete.isPending = false
  })

  it('shows attendance counts and player rows', () => {
    mockAttendances = [attendance('p1', 'confirmed'), attendance('p2', 'declined')]

    render(<SessionAttendancePanel sessionId="sess-1" />)

    expect(screen.getByText('Attendance')).toBeInTheDocument()
    expect(screen.getByText('1 confirmed · 1 declined · 1 pending')).toBeInTheDocument()
    expect(screen.getByText('Alice S.')).toBeInTheDocument()
    expect(screen.getByText('Bob J.')).toBeInTheDocument()
    expect(screen.getByText('Carol D.')).toBeInTheDocument()
  })

  it('lets the linked player confirm attendance', () => {
    render(<SessionAttendancePanel sessionId="sess-1" />)

    fireEvent.click(screen.getByRole('button', { name: 'Confirmed Alice Smith' }))

    expect(mockUpsert.mutate).toHaveBeenCalledWith({
      sessionId: 'sess-1',
      playerId: 'p1',
      status: 'confirmed',
    })
  })

  it('removes attendance when the same status is toggled again', () => {
    mockAttendances = [attendance('p1', 'confirmed')]

    render(<SessionAttendancePanel sessionId="sess-1" />)

    fireEvent.click(screen.getByRole('button', { name: 'Confirmed Alice Smith' }))

    expect(mockDelete.mutate).toHaveBeenCalledWith({
      sessionId: 'sess-1',
      playerId: 'p1',
    })
  })

  it('only exposes controls for the linked player when not admin', () => {
    render(<SessionAttendancePanel sessionId="sess-1" />)

    expect(screen.getByRole('button', { name: 'Confirmed Alice Smith' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Confirmed Bob Jones' })).not.toBeInTheDocument()
    expect(screen.getAllByText('No response')).toHaveLength(2)
  })

  it('allows admins to edit every player', () => {
    mockIsAdmin = true

    render(<SessionAttendancePanel sessionId="sess-1" />)

    expect(screen.getByRole('button', { name: 'Confirmed Alice Smith' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Confirmed Bob Jones' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Confirmed Carol Davis' })).toBeInTheDocument()
  })
})
