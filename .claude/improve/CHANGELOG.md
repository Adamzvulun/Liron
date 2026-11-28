# Improvement changelog

## Scoreboard

`retro` updates this at each retro, from LOG.md.

| As of | Tasks logged | First-time review pass | Avg rework | Tokens per task (trend) | Prompt lines (agents + CLAUDE.md) |
|-------|--------------|------------------------|------------|-------------------------|-----------------------------------|
| Retro 1, 2026-11-28 | 2 | 1 of 2 (50%) | 0.5 (1 of 2 had rework) | — (one full data point: 38.5k subagent tokens for the spell-90 task; the other row was partly inline) | 391 |

Retro 1 note: 2 rows is too few for a rate or a trend; these are the baseline. Before the log, HANDOFF 203 records rework on #534 (two review rounds) and #541 (a delete-key bug the reviewer caught), with no token counts.

## Applied changes

One entry per applied proposal, newest first. Each is its own commit `improve: <what> (proposal #N)`; undo with `git revert <sha>`. Verdicts come from the next retro.

| Date | Proposal | Change | Commit | Metric expected to move | Verdict |
|------|----------|--------|--------|-------------------------|---------|
