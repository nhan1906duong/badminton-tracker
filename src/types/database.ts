// Generated Supabase types placeholder
// Run: npx supabase gen types typescript --project-id <ref> --schema public > src/types/database.ts

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Profile {
  id: string
  avatar_url?: string | null
  updated_at?: string
  role: 'admin' | 'user'
  player_id?: string | null
}

export interface Player {
  id: string
  name: string
  email?: string | null
  avatar_url?: string | null
  rating: number
  created_at: string
  created_by: string
}

export type SessionType = 'regular' | 'tournament' | 'league'

export interface Session {
  id: string
  type: SessionType
  label?: string | null
  started_at: string
  ended_at?: string | null
  bwf_tournament_id?: string | null
  league_match_type?: MatchType | null
  league_total_rounds?: number | null
  created_by: string
  created_at: string
  bwf_tournaments?: {
    category_name: string
    category_slug: string
  } | null
}

export type MatchStatus = 'SCHEDULED' | 'LIVE' | 'COMPLETED'

export interface Match {
  id: string
  session_id: string
  match_type: MatchType
  played_at: string
  ended_at?: string | null
  notes?: string | null
  status: MatchStatus
  queue_position: number | null
  league_round?: number | null
  created_by: string
  created_at: string
}

export type MatchType =
  | 'MEN_SINGLES'
  | 'WOMEN_SINGLES'
  | 'MEN_DOUBLES'
  | 'WOMEN_DOUBLES'
  | 'MIXED_DOUBLES'

export const MATCH_TYPE_LABELS: Record<MatchType, string> = {
  MEN_SINGLES: "Men's Singles",
  WOMEN_SINGLES: "Women's Singles",
  MEN_DOUBLES: "Men's Doubles",
  WOMEN_DOUBLES: "Women's Doubles",
  MIXED_DOUBLES: 'Mixed Doubles',
}

export function getRequiredPlayerCount(type: MatchType): number {
  return type === 'MEN_SINGLES' || type === 'WOMEN_SINGLES' ? 2 : 4
}

export function getRequiredPlayersPerTeam(matchType: MatchType): number {
  return matchType === 'MEN_SINGLES' || matchType === 'WOMEN_SINGLES' ? 1 : 2
}

export interface MatchTeam {
  id: string
  match_id: string
  team_label: 'TEAM_A' | 'TEAM_B'
  is_winner: boolean
}

export interface MatchParticipant {
  id: string
  match_id: string
  team_id: string
  player_id: string
}

export interface MatchScore {
  id: string
  match_id: string
  set_number: number
  team_a_score: number
  team_b_score: number
}

export interface MatchWithDetails extends Match {
  teams: MatchTeam[]
  participants: (MatchParticipant & { player: Player })[]
  scores: MatchScore[]
}

export interface SetScore {
  set_number: number
  team_a_score: number
  team_b_score: number
}

export interface PlayerMatchResult {
  id: string
  player_id: string
  match_id: string
  session_id: string
  is_winner: boolean
  team_score: number
  opponent_score: number
  base_points: number
  attendance_points: number
  score_bonus: number
  strength_bonus: number
  total_weekly_points: number
  rating_before: number | null
  rating_after: number | null
  rating_delta: number | null
  created_at: string
}

export type AttendanceStatus = 'confirmed' | 'declined'

export interface SessionAttendance {
  id: string
  session_id: string
  player_id: string
  status: AttendanceStatus
  created_at: string
  updated_at: string
  created_by: string | null
  player?: Player
}

export const MAX_RACKETS_PER_PLAYER = 4

export const RACKET_BRANDS = ['Yonex', 'Mizuno', 'Li-Ning', 'Victor', 'Felet', 'Other'] as const

export type RacketBrand = (typeof RACKET_BRANDS)[number]

export interface PlayerRacket {
  id: string
  player_id: string
  brand: string
  real_name: string
  nickname?: string | null
  created_at: string
}

export interface LeagueTeam {
  id: string
  session_id: string
  name: string
  created_at: string
}

export interface LeagueTeamPlayer {
  league_team_id: string
  player_id: string
  player?: Player
}

export interface LeagueTeamWithPlayers extends LeagueTeam {
  players: Player[]
}

export interface TeamStanding {
  teamId: string
  teamName: string
  played: number
  wins: number
  losses: number
  points: number
}

export function getSessionName(session: Session, locale: string = 'en'): string {
  if (session.label) return session.label
  if (session.type === 'tournament' && session.bwf_tournaments) {
    return session.bwf_tournaments.category_name
  }
  const LOCALE_TAG: Record<string, string> = { en: 'en-US', vi: 'vi-VN' }
  return new Date(session.started_at).toLocaleDateString(LOCALE_TAG[locale] ?? 'en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  })
}
