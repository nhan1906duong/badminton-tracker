-- Phase 1 & 3 scalability RPCs
-- count_ranked_matches, get_player_ranking_summary, get_leaderboard_page, get_badge_leaders

-- ---------------------------------------------------------------------------
-- 1. count_ranked_matches
-- Counts distinct match_id values from player_match_results.
-- Preserves current "ranked matches" semantics (not matches.status = 'COMPLETED').
-- ---------------------------------------------------------------------------
create or replace function count_ranked_matches()
returns bigint
language sql
stable
security invoker
set search_path = public
as $$
  select count(distinct match_id)
  from player_match_results;
$$;

-- ---------------------------------------------------------------------------
-- 2. get_player_ranking_summary
-- Returns one player's ranking snapshot as JSON.
-- Stats aggregate only from ended sessions (ended_at is not null).
-- rank = count of players with a strictly higher rating + 1.
-- rankChange is stubbed as 0 until a leaderboard cache is added (Phase 4).
-- ---------------------------------------------------------------------------
create or replace function get_player_ranking_summary(p_player_id uuid)
returns json
language plpgsql
stable
security invoker
set search_path = public
as $$
declare
  v_result json;
begin
  select json_build_object(
    'playerId',          p.id,
    'name',              p.name,
    'avatarUrl',         p.avatar_url,
    'rating',            coalesce(p.rating, 1000),
    'rank',              (
                           select count(*) + 1
                           from players p2
                           where coalesce(p2.rating, 1000) > coalesce(p.rating, 1000)
                         ),
    'matchesPlayed',     coalesce(s.matches_played, 0),
    'wins',              coalesce(s.wins, 0),
    'losses',            coalesce(s.losses, 0),
    'winRate',           case
                           when coalesce(s.matches_played, 0) > 0
                           then s.wins::float / s.matches_played
                           else 0
                         end,
    'totalWeeklyPoints', coalesce(s.total_weekly_points, 0),
    'averageWeeklyPoints', case
                             when coalesce(s.matches_played, 0) > 0
                             then s.total_weekly_points::float / s.matches_played
                             else 0
                           end,
    'pointsFor',         coalesce(s.points_for, 0),
    'pointsAgainst',     coalesce(s.points_against, 0),
    'pointDifference',   coalesce(s.points_for, 0) - coalesce(s.points_against, 0),
    'totalRatingDelta',  coalesce(s.total_rating_delta, 0),
    'lastSessionRatingDelta', 0,
    'rankChange',        0,
    'topOneWeekStreak',  0
  )
  into v_result
  from players p
  left join lateral (
    select
      count(distinct pmr.match_id)                       as matches_played,
      count(*) filter (where pmr.is_winner)              as wins,
      count(*) filter (where not pmr.is_winner)          as losses,
      sum(pmr.total_weekly_points)                       as total_weekly_points,
      sum(pmr.team_score)                                as points_for,
      sum(pmr.opponent_score)                            as points_against,
      sum(coalesce(pmr.rating_delta, 0))                 as total_rating_delta
    from player_match_results pmr
    join sessions ses on ses.id = pmr.session_id
    where pmr.player_id = p_player_id
      and ses.ended_at is not null
  ) s on true
  where p.id = p_player_id;

  return v_result;
end;
$$;

-- ---------------------------------------------------------------------------
-- 3. get_leaderboard_page
-- Returns a page of ranked players for the all-time leaderboard.
-- Tie-breaker: rating desc → avg_weekly_points desc → win_rate desc → point_difference desc.
-- Mirrors the React sort in usePlayerRankings() exactly.
-- last_session_delta, rank_change, top_one_week_streak are stubbed as 0 (Phase 4).
-- ---------------------------------------------------------------------------
create or replace function get_leaderboard_page(
  p_limit  int default 50,
  p_offset int default 0
)
returns table (
  player_id             uuid,
  name                  text,
  avatar_url            text,
  rating                int,
  rank                  bigint,
  matches_played        bigint,
  wins                  bigint,
  losses                bigint,
  win_rate              float,
  total_weekly_points   bigint,
  avg_weekly_points     float,
  points_for            bigint,
  points_against        bigint,
  point_difference      bigint,
  total_rating_delta    float,
  last_session_delta    float,
  rank_change           int,
  top_one_week_streak   int
)
language sql
stable
security invoker
set search_path = public
as $$
  with ended_sessions as (
    select id from sessions where ended_at is not null
  ),
  player_stats as (
    select
      pmr.player_id,
      count(distinct pmr.match_id)                       as matches_played,
      count(*) filter (where pmr.is_winner)              as wins,
      count(*) filter (where not pmr.is_winner)          as losses,
      sum(pmr.total_weekly_points)                       as total_weekly_points,
      sum(pmr.team_score)                                as points_for,
      sum(pmr.opponent_score)                            as points_against,
      sum(coalesce(pmr.rating_delta, 0))                 as total_rating_delta
    from player_match_results pmr
    where pmr.session_id in (select id from ended_sessions)
    group by pmr.player_id
  ),
  ranked as (
    select
      p.id                                                   as player_id,
      p.name,
      p.avatar_url,
      coalesce(p.rating, 1000)                               as rating,
      coalesce(ps.matches_played, 0)                         as matches_played,
      coalesce(ps.wins, 0)                                   as wins,
      coalesce(ps.losses, 0)                                 as losses,
      case when coalesce(ps.matches_played, 0) > 0
        then ps.wins::float / ps.matches_played
        else 0 end                                           as win_rate,
      coalesce(ps.total_weekly_points, 0)                    as total_weekly_points,
      case when coalesce(ps.matches_played, 0) > 0
        then ps.total_weekly_points::float / ps.matches_played
        else 0 end                                           as avg_weekly_points,
      coalesce(ps.points_for, 0)                             as points_for,
      coalesce(ps.points_against, 0)                         as points_against,
      coalesce(ps.points_for, 0) - coalesce(ps.points_against, 0) as point_difference,
      coalesce(ps.total_rating_delta, 0)                     as total_rating_delta,
      row_number() over (
        order by
          coalesce(p.rating, 1000) desc,
          case when coalesce(ps.matches_played, 0) > 0
            then ps.total_weekly_points::float / ps.matches_played
            else 0 end desc,
          case when coalesce(ps.matches_played, 0) > 0
            then ps.wins::float / ps.matches_played
            else 0 end desc,
          coalesce(ps.points_for, 0) - coalesce(ps.points_against, 0) desc
      ) as rank
    from players p
    left join player_stats ps on ps.player_id = p.id
  )
  select
    r.player_id,
    r.name,
    r.avatar_url,
    r.rating,
    r.rank,
    r.matches_played,
    r.wins,
    r.losses,
    r.win_rate,
    r.total_weekly_points,
    r.avg_weekly_points,
    r.points_for,
    r.points_against,
    r.point_difference,
    r.total_rating_delta,
    0::float  as last_session_delta,
    0::int    as rank_change,
    0::int    as top_one_week_streak
  from ranked r
  order by r.rank
  limit p_limit offset p_offset;
$$;

-- ---------------------------------------------------------------------------
-- 4. get_badge_leaders
-- Returns the leader player_id and count for each badge type that can be
-- determined server-side without session-ordered aggregation.
-- Covers: most_played (most ranked matches) and most_donated (most losses).
-- Streak and dynasty require session-ordered aggregation; deferred to Phase 4.
-- Returns multiple rows if tied at the top (both leaders get the badge).
-- ---------------------------------------------------------------------------
create or replace function get_badge_leaders()
returns table (
  badge_type   text,
  leader_id    uuid,
  leader_count bigint
)
language sql
stable
security invoker
set search_path = public
as $$
  -- most_played: players who share the highest distinct ranked match count
  with most_played_counts as (
    select player_id, count(distinct match_id) as cnt
    from player_match_results
    group by player_id
  ),
  most_played_max as (
    select max(cnt) as max_cnt from most_played_counts where cnt > 0
  ),
  -- most_donated: players who share the highest loss count
  most_donated_counts as (
    select player_id, count(*) filter (where not is_winner) as cnt
    from player_match_results
    group by player_id
  ),
  most_donated_max as (
    select max(cnt) as max_cnt from most_donated_counts where cnt > 0
  )
  select 'most_played'::text, mpc.player_id, mpc.cnt
  from most_played_counts mpc, most_played_max mpm
  where mpc.cnt = mpm.max_cnt

  union all

  select 'most_donated'::text, mdc.player_id, mdc.cnt
  from most_donated_counts mdc, most_donated_max mdm
  where mdc.cnt = mdm.max_cnt;
$$;
