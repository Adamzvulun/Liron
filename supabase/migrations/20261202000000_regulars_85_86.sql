-- The regulars for word chapters 84–85 (the last practical B1 words and a few B2): chapters
-- LXXXV–LXXXVI, early spring at the inn. Each trial sends trial-<n>, and a pass gives a brass
-- chest through the existing chest rules (ADR 0033).
insert into public.subject_event_kinds (subject_id, kind, daily_cap)
  select 'arabic', 'trial-' || n, 1
  from generate_series(85, 86) n
on conflict do nothing;
