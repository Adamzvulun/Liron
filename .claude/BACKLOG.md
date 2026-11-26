# Backlog

The orchestrator's short work list. **PLAN.md and the GitHub issues stay the source of truth** for the phases; this file points to them. "status" summarizes this file; "next" takes the top item of Next.

## In progress
- (Nothing.)

## Next
Each waits on Adam's go.
1. **Release v1.7.0:** merge [#485](https://github.com/Adamzvulun/Liron/pull/485) with a merge commit, check the migrations on production, curl the live site.
2. **Phase 10, safe for friends** ([#495](https://github.com/Adamzvulun/Liron/issues/495), v1.8.0): 10.3 (#501), then 10.1 (#499) and 10.2 (#500) then 10.4 (#498) and 10.5 (#502).
3. **Phase 11, hearing the street** ([#496](https://github.com/Adamzvulun/Liron/issues/496), v1.9.0).
4. **Phase 12, faster than thought** ([#497](https://github.com/Adamzvulun/Liron/issues/497), v1.10.0).
5. **Phase 13, true and lasting** ([#513](https://github.com/Adamzvulun/Liron/issues/513), v1.11.0).
6. **Phase 14, writing words** ([#514](https://github.com/Adamzvulun/Liron/issues/514), v1.12.0).
7. **Phase 15, songs** ([#522](https://github.com/Adamzvulun/Liron/issues/522), v1.13.0).

## Blocked
- **Phase 15.3** (#525): Adam sets up the songs' Google Cloud project with billing and a budget alert, `GEMINI_SONGS_API_KEY` and `ANTHROPIC_API_KEY` in Vercel, and a Claude Console spend limit. Then the 8-song eval runs first.
- **Parked by Adam** ([LATER.md](../docs/process/LATER.md)): the third subject (#337), the regulars' voices (#342), the Fellowship's release (#332), the square on his phone (#137).

## Done
- (Newest first. Trim to the last ~10.)
- **Agent factory** (PR #531, 2026-11-26): agents, roster, backlog, commands, the orchestrator section. Test run: the two tale fixes (#495) with a regression test; reviewer PASS.
