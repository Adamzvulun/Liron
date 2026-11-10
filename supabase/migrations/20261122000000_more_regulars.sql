-- The regulars for word chapters 11 onward (#205): each new regular's trial sends trial-<n>
-- (chapter XII is trial-12, already registered, up to XXXV for word chapter 34). A pass gives a
-- brass chest through the existing chest rules (ADR 0033), as for chapters II–XI.
insert into public.subject_event_kinds (subject_id, kind, daily_cap)
  select 'arabic', 'trial-' || n, 1
  from generate_series(13, 35) n
on conflict do nothing;
