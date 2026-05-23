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
}

export interface Player {
  id: string
  name: string
  email?: string | null
  avatar_url?: string | null
  is_active: boolean
  created_at: string
  created_by: string
}

export interface Session {
  id: string
  label?: string | null
  started_at: string
  ended_at?: string | null
  bwf_tournament_id?: string | null
  created_by: string
  created_at: string
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
