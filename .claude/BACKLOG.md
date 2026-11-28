# Backlog

The orchestrator's short work list. **PLAN.md and the GitHub issues stay the source of truth** for the phases; this file points to them. "status" summarizes this file; "next" takes the top item of Next.

## In progress
- **Self-improvement loops** (branch `claude/improve-loops`): the task log, agent memory, the `retro` agent, `/retro`, `/improve`, `/scoreboard`, the guardrails. First retro as the test.

## Next
1. **Phase 15, songs** ([#522](https://github.com/Adamzvulun/Liron/issues/522), v1.13.0): 15.1 and 15.2 merged. Next is 15.3, which needs keys; Adam deals with those when we get there. 15.4 and 15.5 follow it.
2. **Phase 11, hearing the street** ([#496](https://github.com/Adamzvulun/Liron/issues/496), v1.9.0): 11.1 merged, but players can't see it yet. 11.2 and 11.3 need the sentence list (Blocked).

## Blocked
- **Phase 11's sentence list:** it needs the licensed deck, which is only on Adam's machine. Adam doesn't want to run anything himself, so it waits until he says otherwise.
- **13.2's retention ADR** ([#516](https://github.com/Adamzvulun/Liron/issues/516)): it needs production numbers that Claude can't read. The size report is in the monthly check; it's needed only if the database grows.
- **Parked by Adam** ([LATER.md](../docs/process/LATER.md)): the third subject (#337), the regulars' voices (#342), the Fellowship's release (#332), the square on his phone (#137).

## Done
- **graphify, ponytail and auto-compact in every session** (#549, 2026-11-28): the session-start hook, the code graph, the agents query it (HANDOFF 206).
- (Newest first. Trim to the last ~10.)
- **v1.7.0 and v1.8.0 released** (#485, #547, 2026-11-28). v1.8.0 carries Phases 10 and 12–14. Built issues closed.
- **/away run** (2026-11-26 to 2026-11-27): PRs #533–#544 into `dev` (HANDOFF 203).
- **Agent factory** (PR #531, 2026-11-26): agents, roster, backlog, commands, the orchestrator section. Test run: the two tale fixes (#495) with a regression test; reviewer PASS.
