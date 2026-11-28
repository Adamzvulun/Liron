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
| 2026-11-28 | #3 | tester names the two known intermittent tests; a repeat failure becomes a root-cause task | 7278143 | first-time review pass rate and rework; a LOG row naming either test | pending |
| 2026-11-28 | #2 | memory rule stated once in CLAUDE.md, removed from 7 agents | 2e5c02a | prompt lines (-7); no task state or personal data in agent memory | pending |
| 2026-11-28 | #1 | scout and architect: the graph has no string literals, Grep ids directly; scout's two Grep lines merged | 677d369 | scout and architect tool calls per lookup; prompt lines (-1) | pending |
