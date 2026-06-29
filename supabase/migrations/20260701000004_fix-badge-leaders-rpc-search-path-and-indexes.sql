-- Phase 11: Fix set search_path = public on get_badge_leaders + old scalability RPCs.
-- Also adds missing matches.created_by index and a covering index on
-- player_match_results for badge aggregation queries.
--
-- get_badge_leaders was redefined in 20260626000001 (after Phase 8 ran) with the old
-- set search_path = public pattern — missed by 20260701000002_fix-secdef-search-path.sql.
-- Old scalability RPCs are superseded by materialized stats tables but remain callable
-- on the DB — patched here for consistency.

-- ============================================================
-- get_badge_leaders — fix search_path, fully qualify all refs
-- ============================================================

create or replace function get_badge_leaders()
returns table (
  badge_type   text,
  leader_id    uuid,
  leader_count bigint
)
language sql
stable
security invoker
set search_path = ''
as $$
  with
  most_played_counts as (
    select player_id, count(distinct match_id) as cnt
    from public.player_match_results
    group by player_id
  ),
  most_played_max as (
    select max(cnt) as max_cnt from most_played_counts where cnt > 0
  ),
  most_donated_counts as (
    select player_id, count(*) filter (where not is_winner) as cnt
    from public.player_match_results
    group by player_id
  ),
  most_donated_max as (
    select max(cnt) as max_cnt from most_donated_counts where cnt > 0
  ),
  most_titles_counts as (
    select pss.player_id, count(*) as cnt
    from public.player_session_stats pss
    join public.sessions s on s.id = pss.session_id
    where pss.session_rank = 1
      and s.ended_at is not null
      and s.bwf_tournament_id is not null
      and not exists (
        select 1 from public.player_session_stats pss2
        where pss2.session_id = pss.session_id
          and pss2.session_rank = 1
          and pss2.player_id != pss.player_id
      )
    group by pss.player_id
  ),
  most_titles_max as (
    select max(cnt) as max_cnt from most_titles_counts where cnt > 0
  ),
  session_winners as (
    select
      pss.player_id                                       as winner_id,
      row_number() over (order by s.started_at desc)::int as rn
    from public.sessions s
    join public.player_session_stats pss
      on pss.session_id = s.id and pss.session_rank = 1
    where s.ended_at is not null
      and not exists (
        select 1 from public.player_session_stats pss2
        where pss2.session_id = s.id
          and pss2.session_rank = 1
          and pss2.player_id != pss.player_id
      )
  ),
  current_champion as (
    select winner_id from session_winners where rn = 1
  ),
  dynasty_streak as (
    select (
      coalesce(
        (select min(rn) from session_winners
         where winner_id != (select winner_id from current_champion)),
        (select count(*)::int + 1 from session_winners)
      ) - 1
    )::bigint as streak_count
  )

  select 'most_played'::text, mpc.player_id, mpc.cnt
  from most_played_counts mpc, most_played_max mpm
  where mpc.cnt = mpm.max_cnt

  union all

  select 'most_donated'::text, mdc.player_id, mdc.cnt
  from most_donated_counts mdc, most_donated_max mdm
  where mdc.cnt = mdm.max_cnt

  union all

  select 'most_titles'::text, mtc.player_id, mtc.cnt
  from most_titles_counts mtc, most_titles_max mtm
  where mtc.cnt = mtm.max_cnt

  union all

  select 'dynasty'::text,
         (select winner_id from current_champion),
         ds.streak_count
  from dynasty_streak ds
  where ds.streak_count > 1
    and (select winner_id from current_champion) is not null;
$$;

-- ============================================================
-- Old scalability RPCs — fix search_path (superseded but callable)
-- ============================================================

create or replace function count_ranked_matches()
returns bigint
language sql
stable
security invoker
set search_path = ''
as $$
  select count(distinct match_id)
  from public.player_match_results;
$$;

create or replace function get_player_ranking_summary(p_player_id uuid)
returns json
language plpgsql
stable
security invoker
set search_path = ''
as $$
declare
  v_result json;
begin
  select json_build_object(
    'playerId',             p.id,
    'name',                 p.name,
    'avatarUrl',            p.avatar_url,
    'rating',               coalesce(p.rating, 1000),
    'rank',                 (
                              select count(*) + 1
                              from public.players p2
                              where coalesce(p2.rating, 1000) > coalesce(p.rating, 1000)
                            ),
    'matchesPlayed',        coalesce(s.matches_played, 0),
    'wins',                 coalesce(s.wins, 0),
    'losses',               coalesce(s.losses, 0),
    'winRate',              case
                              when coalesce(s.matches_played, 0) > 0
                              then s.wins::float / s.matches_played
                              else 0
                            end,
    'totalWeeklyPoints',    coalesce(s.total_weekly_points, 0),
    'averageWeeklyPoints',  case
                              when coalesce(s.matches_played, 0) > 0
                              then s.total_weekly_points::float / s.matches_played
                              else 0
                            end,
    'pointsFor',            coalesce(s.points_for, 0),
    'pointsAgainst',        coalesce(s.points_against, 0),
    'pointDifference',      coalesce(s.points_for, 0) - coalesce(s.points_against, 0),
    'totalRatingDelta',     coalesce(s.total_rating_delta, 0),
    'lastSessionRatingDelta', 0,
    'rankChange',           0,
    'topOneWeekStreak',     0
  )
  into v_result
  from public.players p
  left join lateral (
    select
      count(distinct pmr.match_id)              as matches_played,
      count(*) filter (where pmr.is_winner)     as wins,
      count(*) filter (where not pmr.is_winner) as losses,
      sum(pmr.total_weekly_points)              as total_weekly_points,
      sum(pmr.team_score)                       as points_for,
      sum(pmr.opponent_score)                   as points_against,
      sum(coalesce(pmr.rating_delta, 0))        as total_rating_delta
    from public.player_match_results pmr
    join public.sessions ses on ses.id = pmr.session_id
    where pmr.player_id = p_player_id
      and ses.ended_at is not null
  ) s on true
  where p.id = p_player_id;

  return v_result;
end;
$$;

create or replace function get_leaderboard_page(
  p_limit  int default 50,
  p_offset int default 0
)
returns table (
  player_id           uuid,
  name                text,
  avatar_url          text,
  rating              int,
  rank                bigint,
  matches_played      bigint,
  wins                bigint,
  losses              bigint,
  win_rate            float,
  total_weekly_points bigint,
  avg_weekly_points   float,
  points_for          bigint,
  points_against      bigint,
  point_difference    bigint,
  total_rating_delta  float,
  last_session_delta  float,
  rank_change         int,
  top_one_week_streak int
)
language sql
stable
security invoker
set search_path = ''
as $$
  with ended_sessions as (
    select id from public.sessions where ended_at is not null
  ),
  player_stats as (
    select
      pmr.player_id,
      count(distinct pmr.match_id)              as matches_played,
      count(*) filter (where pmr.is_winner)     as wins,
      count(*) filter (where not pmr.is_winner) as losses,
      sum(pmr.total_weekly_points)              as total_weekly_points,
      sum(pmr.team_score)                       as points_for,
      sum(pmr.opponent_score)                   as points_against,
      sum(coalesce(pmr.rating_delta, 0))        as total_rating_delta
    from public.player_match_results pmr
    where pmr.session_id in (select id from ended_sessions)
    group by pmr.player_id
  ),
  ranked as (
    select
      p.id                                                        as player_id,
      p.name,
      p.avatar_url,
      coalesce(p.rating, 1000)                                    as rating,
      coalesce(ps.matches_played, 0)                              as matches_played,
      coalesce(ps.wins, 0)                                        as wins,
      coalesce(ps.losses, 0)                                      as losses,
      case when coalesce(ps.matches_played, 0) > 0
        then ps.wins::float / ps.matches_played else 0 end        as win_rate,
      coalesce(ps.total_weekly_points, 0)                         as total_weekly_points,
      case when coalesce(ps.matches_played, 0) > 0
        then ps.total_weekly_points::float / ps.matches_played
        else 0 end                                                as avg_weekly_points,
      coalesce(ps.points_for, 0)                                  as points_for,
      coalesce(ps.points_against, 0)                              as points_against,
      coalesce(ps.points_for, 0) - coalesce(ps.points_against, 0) as point_difference,
      coalesce(ps.total_rating_delta, 0)                          as total_rating_delta,
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
    from public.players p
    left join player_stats ps on ps.player_id = p.id
  )
  select
    r.player_id, r.name, r.avatar_url, r.rating, r.rank,
    r.matches_played, r.wins, r.losses, r.win_rate,
    r.total_weekly_points, r.avg_weekly_points,
    r.points_for, r.points_against, r.point_difference,
    r.total_rating_delta,
    0::float as last_session_delta,
    0::int   as rank_change,
    0::int   as top_one_week_streak
  from ranked r
  order by r.rank
  limit p_limit offset p_offset;
$$;

-- ============================================================
-- Index: matches.created_by (FK column — sessions has one, matches didn't)
-- ============================================================

create index if not exists idx_matches_created_by
  on public.matches (created_by);

-- ============================================================
-- Covering index: player_match_results for get_badge_leaders
-- count(distinct match_id) group by player_id → player_id + match_id
-- count(*) filter (not is_winner) group by player_id → player_id + is_winner
-- One composite index enables index-only scans for both aggregations.
-- ============================================================

create index if not exists idx_pmr_player_winner_match
  on public.player_match_results (player_id, is_winner, match_id);
