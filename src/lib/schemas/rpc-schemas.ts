import { z } from 'zod'

// ── Shared: player_all_time_stats row ───────────────────────────────────────
const PlayerSnapshotSchema = z.object({
  id: z.string(),
  name: z.string(),
  avatar_url: z.string().nullable(),
  rating: z.number(),
})

export const AllTimeStatsRowSchema = z.object({
  all_time_rank: z.number(),
  matches_played: z.number(),
  wins: z.number(),
  losses: z.number(),
  win_rate: z.number(),
  total_weekly_points: z.union([z.number(), z.string()]),
  avg_weekly_points: z.number(),
  points_for: z.union([z.number(), z.string()]),
  points_against: z.union([z.number(), z.string()]),
  point_difference: z.union([z.number(), z.string()]),
  total_rating_delta: z.number(),
  last_session_delta: z.number(),
  rank_change: z.number(),
  top_one_week_streak: z.number(),
  player: PlayerSnapshotSchema,
})

export type AllTimeStatsRow = z.infer<typeof AllTimeStatsRowSchema>

// ── get_badge_leaders() RPC ─────────────────────────────────────────────────
export const BadgeLeaderRowSchema = z.object({
  badge_type: z.string(),
  leader_id: z.string(),
  leader_count: z.union([z.number(), z.string()]),
})

export type BadgeLeaderRow = z.infer<typeof BadgeLeaderRowSchema>

// ── Parse helper ────────────────────────────────────────────────────────────
// Dev: warns on shape mismatch without throwing. Prod: throws to surface drift early.
export function parseRpcResult<T>(schema: z.ZodType<T>, data: unknown, label: string): T {
  if (import.meta.env.DEV) {
    const result = schema.safeParse(data)
    if (!result.success) {
      console.warn(`[rpc-schema] ${label} shape mismatch:`, result.error.flatten())
      return data as T
    }
    return result.data
  }
  return schema.parse(data)
}
