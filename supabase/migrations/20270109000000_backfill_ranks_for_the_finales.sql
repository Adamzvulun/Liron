-- Waymark: the ranks the finales now wait for (report §4do, third review, 2026-11-19). Applies to
-- dev on merge and to prod on release (ADR 0018).
--
-- Since 20270108, trial-forty-winters counts only after rank-ghost, and
-- trial-stranger-at-the-gate only after rank-storyteller. A player whose saved progress holds the
-- rank but whose rank event was never counted (a save that failed before held saves were sent
-- again) would pass the finale and lose its rewards: the app sends the finale's event once. The
-- backfill of 20261226 fills in, once more, every trial and rank the saved progress records and
-- the events don't; the chests and gear they earned arrive with the next save.
select public.backfill_ordered_events();
