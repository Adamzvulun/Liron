-- Waymark: the Radio Room on the air (E16, #223): its contracts and achievements. Applies to dev
-- on merge and to prod on release (ADR 0018).
--
-- A contact sends `qso` for every try, `qso-logged` and `worked-<operator>` for a logged one,
-- and `qso-clean-fast` once, for a logged contact at 25 wpm with no repeats (the Signal
-- Master's QSO; the rank itself is read from the subject state, as the others are).

insert into public.subject_event_kinds (subject_id, kind, daily_cap) values
  ('morse', 'qso', 100),
  ('morse', 'qso-logged', 100),
  ('morse', 'qso-clean-fast', 1),
  ('morse', 'worked-nils', 1),
  ('morse', 'worked-marta', 1),
  ('morse', 'worked-ivo', 1),
  ('morse', 'worked-kai', 1),
  ('morse', 'worked-ruth', 1),
  ('morse', 'worked-dex', 1);

-- Offered once you've answered a call in the room, so nobody gets them before the Far Station.
insert into public.contract_templates (id, subject_id, metric, kind, target, gold, text, requires_kind) values
  ('morse-qso', 'morse', 'event', 'qso-logged', 1, 20, 'Log a contact in the Radio Room', 'qso'),
  ('morse-qso-2', 'morse', 'event', 'qso', 2, 15, 'Answer 2 calls in the Radio Room', 'qso');

insert into public.achievements (id, condition, gems, title) values
  ('worked-all', '{"kind": "events", "subject": "morse", "kinds": ["worked-nils", "worked-marta", "worked-ivo", "worked-kai", "worked-ruth", "worked-dex"], "n": 6}', 3, 'of the Airwaves'),
  ('full-logbook', '{"kind": "event-total", "subject": "morse", "kind_of": "qso-logged", "n": 50}', 3, null);
