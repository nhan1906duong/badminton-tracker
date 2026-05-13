// Generated Supabase types — update via: npx supabase gen types typescript --project-id <id> --schema public > src/types/database.ts
// Placeholder: types will be generated after Supabase schema is set up

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

// Define base types here until generated types are available
export interface Player {
  id: string
  name: string
  email?: string | null
  avatar_url?: string | null
  created_at: string
  created_by: string
}

export interface Match {
  id: string
  match_type: string
  played_at: string
  notes?: string | null
  created_by: string
  created_at: string
}

export interface MatchTeam {
  id: string
  match_id: string
  team_label: string
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
