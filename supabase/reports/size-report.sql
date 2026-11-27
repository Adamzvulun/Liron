-- The data budget (task 13.2, #516). Read-only: paste it into the Supabase dashboard's
-- SQL editor and run it. The free database holds 500 MB. RUNNING.md's monthly check uses it.
--
-- One row per table: its size on disk (with indexes and TOAST), its rows, and, for the
-- tables that only ever grow, rows per player per active day.
with growth as (
  select 'review_log' as tbl, count(*) as n, count(distinct (user_id, reviewed_at::date)) as player_days
    from public.review_log
  union all
  select 'rating_log', count(*), count(distinct (user_id, rated_at::date)) from public.rating_log
  union all
  select 'subject_events', count(*), count(distinct (user_id, day)) from public.subject_events
  union all
  select 'saved_sessions', count(*), count(distinct (user_id, saved_at::date)) from public.saved_sessions
  union all
  select 'chat_lines', count(*), count(distinct (user_id, day)) from public.chat_lines
)
select c.relname as table_name,
       pg_size_pretty(pg_total_relation_size(c.oid)) as size,
       pg_total_relation_size(c.oid) as bytes,
       c.reltuples::bigint as rows_estimate,
       round(g.n::numeric / nullif(g.player_days, 0), 1) as rows_per_player_day
  from pg_catalog.pg_class c
  join pg_catalog.pg_namespace s on s.oid = c.relnamespace
  left join growth g on g.tbl = c.relname
 where s.nspname = 'public' and c.relkind = 'r'
union all
select '(whole database)', pg_size_pretty(pg_database_size(current_database())),
       pg_database_size(current_database()), null, null
 order by bytes desc;
