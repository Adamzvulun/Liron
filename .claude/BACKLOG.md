# Backlog

The orchestrator's short work list. **PLAN.md and the GitHub issues stay the source of truth** for the phases; this file points to them. "status" summarizes this file; "next" takes the top item of Next.

## In progress
- **/away run (2026-11-26):** Phase 10 on `dev`. Decisions are in HANDOFF 203.

## Next
Adam's `/away` is his go for these, except releases into `main`.
1. **Waiting for Adam: release v1.7.0:** merge [#485](https://github.com/Adamzvulun/Liron/pull/485) with a merge commit, check the migrations on production, curl the live site.
2. **Phase 10, safe for friends** ([#495](https://github.com/Adamzvulun/Liron/issues/495), v1.8.0): 10.3 (#501, PR #533, merged), then 10.1 (#499) and 10.2 (#500) (PR #534, merged) then 10.4 (#498) and 10.5 (#502).
3. **Phase 11, hearing the street** ([#496](https://github.com/Adamzvulun/Liron/issues/496), v1.9.0): 11.1 built dark. 11.2 and 11.3 wait for the sentence list (Blocked).
4. **Phase 12, faster than thought** ([#497](https://github.com/Adamzvulun/Liron/issues/497), v1.10.0): 12.1 (#536) and 12.2–12.4 (#537) merged. 12.5 (release) waits for Adam.
5. **Phase 13, true and lasting** ([#513](https://github.com/Adamzvulun/Liron/issues/513), v1.11.0): 13.1 merged (#538). 13.2: the size report is built, and the production numbers wait for Adam. 13.3 built (the milestone check). 13.4 (release v1.11.0) waits for Adam.
6. **Phase 14, writing words** ([#514](https://github.com/Adamzvulun/Liron/issues/514), v1.12.0).
7. **Phase 15, songs** ([#522](https://github.com/Adamzvulun/Liron/issues/522), v1.13.0).

## Blocked
- **Phase 11's sentence list:** it needs the licensed deck, which is only on Adam's machine (HANDOFF 203).
- **Waiting for Adam:** 13.2: run `supabase/reports/size-report.sql` on production (#516). 10.4 (#498): closing the built issues is his (PLAN). 10.5 (#502): the v1.8.0 release into `main`, after v1.7.0 (#485). Also check `delete_my_account()` once on `waymark-dev` (HANDOFF 203).
- **Phase 15.3** (#525): Adam sets up the songs' Google Cloud project with billing and a budget alert, `GEMINI_SONGS_API_KEY` and `ANTHROPIC_API_KEY` in Vercel, and a Claude Console spend limit. Then the 8-song eval runs first.
- **Parked by Adam** ([LATER.md](../docs/process/LATER.md)): the third subject (#337), the regulars' voices (#342), the Fellowship's release (#332), the square on his phone (#137).

## Done
- (Newest first. Trim to the last ~10.)
- **Agent factory** (PR #531, 2026-11-26): agents, roster, backlog, commands, the orchestrator section. Test run: the two tale fixes (#495) with a regression test; reviewer PASS.
