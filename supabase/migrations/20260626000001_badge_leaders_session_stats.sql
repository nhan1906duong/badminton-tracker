-- Extend get_badge_leaders with most_titles and dynasty, computed from player_session_stats.
--
-- most_titles: player(s) with the most ended sessions where they finished rank 1.
-- dynasty:     player currently on the longest consecutive session-win streak (>1).
--
-- Both tie-break the same way as existing badges (all tied leaders get the badge).

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
  with
  -- most_played: players who share the highest distinct ranked match count
  most_played_counts as (
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
  ),
  -- most_titles: players who share the most BWF tournament session championships.
  -- Excludes tied sessions (two players sharing session_rank = 1), matching the
  -- same tie-exclusion logic used by usePlayerAchievements on the client.
  most_titles_counts as (
    select pss.player_id, count(*) as cnt
    from player_session_stats pss
    join sessions s on s.id = pss.session_id
    where pss.session_rank = 1
      and s.ended_at is not null
      and s.bwf_tournament_id is not null
      and not exists (
        select 1 from player_session_stats pss2
        where pss2.session_id = pss.session_id
          and pss2.session_rank = 1
          and pss2.player_id != pss.player_id
      )
    group by pss.player_id
  ),
  most_titles_max as (
    select max(cnt) as max_cnt from most_titles_counts where cnt > 0
  ),
  -- dynasty: assign each ended session a row-number (1 = most recent).
  -- Tied sessions (two players sharing session_rank = 1) are excluded — they
  -- break the streak and don't count as a clean win.
  session_winners as (
    select
      pss.player_id                                        as winner_id,
      row_number() over (order by s.started_at desc)::int  as rn
    from sessions s
    join player_session_stats pss
      on pss.session_id = s.id and pss.session_rank = 1
    where s.ended_at is not null
      and not exists (
        select 1 from player_session_stats pss2
        where pss2.session_id = s.id
          and pss2.session_rank = 1
          and pss2.player_id != pss.player_id
      )
  ),
  current_champion as (
    select winner_id from session_winners where rn = 1
  ),
  -- Streak length = position of the first session NOT won by the current champion,
  -- minus 1.  If the champion won every session, treat the break as (total + 1).
  -- Single MIN scan — O(S) after the window sort, no correlated subquery.
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

  -- dynasty only emits a row when streak > 1 and a champion exists
  select 'dynasty'::text,
         (select winner_id from current_champion),
         ds.streak_count
  from dynasty_streak ds
  where ds.streak_count > 1
    and (select winner_id from current_champion) is not null;
$$;
