# Retro: from the v1.0 plan to Journey's End

- **Dates:** 2026-11-16 (PLAN.md written) to 2026-11-17 (the last sweep, task 5.1).
- **Versions:** v1.0 to v3.0 built on `dev`, with v4.0's guide and LATER.md. The third hall (4.5) waits on Adam's choice of subject.
- **Written on 2026-11-17** by Claude, from the PRs (#343 to #354), the reports (§4ca to §4cx) and the code. Adam's view is still to come; add it here.

## What we built
- **v1.0, never lost:** one compass line naming the next step everywhere, a first page for a new player, no blue backgrounds, the Settings line that says what's switched on, and the release checklist.
- **v1.1 and v1.2:** the ledger (what you've learned, in numbers), the keeper's handbook, sound and motion in the square, and world events.
- **v2.0 to v2.4, friends:** friend codes and the Fellowship, visits, the party feed, challenges and the Arena, quests together and gifts, and the wire (live Morse between two friends).
- **v3.0, Journey's End:** both finales and their capstones (Forty Winters, The Stranger at the Gate), the judge's eval set, the long evenings after the end (master contracts, the station of the day, personal bests), and a script that sets up a test account one step before each finale.
- **v4.0 so far:** the guild-hall kit and LATER.md.

## What worked
- **One plan, in order.** PLAN.md and VERSIONS.md said what came next every time, so no session started by guessing. The rule "decide as Adam would, and write it down" kept the work moving: each call is in an ADR (0040 to 0048) or the report.
- **The database gives every reward.** The finales, the gear and the achievements only needed rows and an event. No new code path could hand out gold by mistake.
- **Screenshots catch what tests don't.** The last sweep found two things no test did: the Notice Board's quiet line drawn in a pale color on parchment, and a long friend's name broken mid-word. Earlier sweeps found the ledger overflowing at 320 pixels.
- **One road per subject, tested end to end.** Each road's tests walk from the first step to the finale and 30 days past it, so "never lost" is a test, not a hope.

## What didn't
- **A slip on privacy.** The first eval runs sent Adam's name to Groq inside a made-up chat. It was caught, changed to an invented name, and disclosed in the report. The rule now lives in the scripts' comments: eval data uses invented names only.
- **Counts written into tests.** Every new step meant editing "274" to "275" and "74" to "75" in several specs. It's cheap, but it fails late, in the browser suite.
- **Built faster than it's been looked at.** Everything after v1.0 waits on Adam's walk of the dev site, and the live site still holds v0.1.0. Ten gates are his (PLAN.md's end). The more stacks up unseen, the more a single "no" at the top costs.
- **Learning results: still none measured.** The ledger now shows them, but nobody has played long enough for it to say anything.

## Next time
- Release v1.0.0 before building on it. The plan had the order right; the gates simply weren't walked.
- Derive counts in tests from the content (the road's length) rather than writing the number down.
- Any script that calls an outside service gets invented data from its first line, and says so at the top.
- When the third hall is picked, build the kit's "Known gaps" first, in their own PR, so the subject itself changes nothing in `src/core/`.
