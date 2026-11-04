# Full review: 2026-11-04

Adam asked: "Run agents each in its own field of expertise… to check everything we've done so far." Six reviewers each looked at `dev` at `374bc79` (after PR #86), read-only:

| Reviewer | What they checked | Full notes |
|---|---|---|
| Security | Database rules, keys, CI, the microphone | [security](2026-11-04-security.md) |
| Code | Correctness of `src/`, `scripts/`, `supabase/` | below |
| QA | The whole suite, twice and under stress, and edge cases in the browser | below |
| UX | 109 screenshots, desktop and phone | below |
| Learning design | Pedagogy and every content file, with the converters run on real data | below |
| Architecture | Docs against code, ADRs, risks before E10 | below |

**The short version:** the core is sound and the tests are green and not flaky (78 browser tests passed twice, plus 145 stress runs). The serious problems were in what the tests didn't check: the browser could write its own rewards, Morse copy runs could be passed by mashing keys, and a few messages and content conversions are wrong.

## Already fixed (all merged into `dev`)
| PR | Fix |
|---|---|
| [#88](https://github.com/Adamzvulun/Liron/pull/88) | **Security (High):** only the database writes rewards; the daily chest pays once; known subjects only, 3,000 XP a day, the time zone changes at most every 20 hours; the deck is read by licensees only ([ADR 0029](../../decisions/0029-database-is-the-only-writer-of-rewards.md)) |
| [#89](https://github.com/Adamzvulun/Liron/pull/89) | **Morse (High):** mashing keys no longer scores 100%; extras count as errors. **Coffee corner:** "Next:" names the right set |
| [#90](https://github.com/Adamzvulun/Liron/pull/90) | The microphone is always released (needed before the speech check); Morse audio contexts are closed |
| [#92](https://github.com/Adamzvulun/Liron/pull/92) | Hebrew bridge: niqqud on the letter, not the geresh; no stray letters in number phrases; one alef for an initial ā |
| [#93](https://github.com/Adamzvulun/Liron/pull/93) | No blank screen when practice has no words; an app-wide error boundary; "Reach 90%" after every set; long sessions no longer report a failed save |
| [#94](https://github.com/Adamzvulun/Liron/pull/94) | Readable brass "Play again" buttons; a wrong Koch answer is marked ✕ and said in words |
| [#95](https://github.com/Adamzvulun/Liron/pull/95) | Security M2: CI secrets only on the steps that use them, `npm ci --ignore-scripts`; L1: audio links last 10 minutes and are renewed |
| [#96](https://github.com/Adamzvulun/Liron/pull/96) | The last Arabic lesson can't be re-passed for its bonus; the Painted Sign waits for all 8 milestones |

## Still to fix (Claude, in this order)
1. ~~Content converters~~ (#92; tanween order is latent and still to do).
2. ~~Crashes and wrong messages~~ (#93, #96).
3. **Fair grading** (code, learning): ~~spaced-repetition grades are all-or-nothing per session; coffee reviews are never graded "good"~~ (fixed: `gradeFrom`). ~~Listen asks for ث/ذ words the speaker says as s/z~~ (#107: Listen skips words whose first letter is said as another letter; ظ and ض too). ق stays: its card teaches the deck's g.
4. **Look and feel** (UX): ~~brass button contrast~~ and ~~Koch wrong answers~~ (#94). ~~guild-coloured text below AA~~ (darker `--guild-*-ink` and `--ember-ink` text tokens, 5.1–6.1:1 on parchment). Left: the slate plaque covers the scroll's goal line on desktop.
5. **Remaining security items:** ~~M2, L1~~ (#95), ~~M3~~ (security headers and CSP). ~~L2, L6~~ fixed; L5 checked and not a gap (sign-out already revokes the session on the server).
6. **Docs:** 39 small doc/code mismatches (STATUS stops at #82, stale "coming soon" text, CI.md); stale GitHub issues.
7. **Tests:** e2e flows that click the first choice and accept any outcome, so pass/fail gates are never checked end to end. Add deterministic pass and fail tests, and a fake database that keeps state.

## Bigger ideas the reviewers recommend (ordered, not dropped)
- **UX "focus mode":** keep activities inside the painted room with one slim bar, which gives the phone back about a third of its height. Plus a shared result card that animates the lamp or milestone you earned.
- **Read distractors with one lookalike letter swapped** (ب/ت/ث/ن/ي, ج/ح/خ…), since the dots are what's hard for Hebrew readers (Ibrahim, Eviatar & Aharon-Peretz 2002).
- **The slate should require the dots:** today ث can pass written as ب.
- ~~**Show the spoken form on Read reveals**~~ (قهوة is spelled with ق but said *gahwa* by this speaker). Done: every Read and Listen reveal adds "Said here:" with the deck's pronunciation in Hebrew letters (`spokenHebrew`).
- **Architecture before E10:** save each session in one all-or-nothing call (today it's 20–40 separate requests); move subject knowledge out of core (the Notice Board's quest list is hard-coded and promises rewards nothing pays).

## Decisions only Adam can make
1. **Prod keys in GitHub (security M1).** Any branch pushed to this repo can read prod's secret key. Options: (a) GitHub Environments, **a paid plan**; (b) keep prod's keys out of GitHub and run prod migrations by hand at release; (c) accept the risk. Claude recommended (b). **Adam (2026-11-04): (c), accepted: "only I am going to push".**
2. **The lesson gate.** "90% twice in a row" on 18 questions means at most one mistake per session; a learner who's truly at 90% passes two in a row only 20% of the time. Options: (a) 90% over the last 36 answers pooled; (b) the second pass on another day (best supported by research); (c) 85% per session. Claude recommended (b). **Adam: (b), built.**
3. **Arabic XP pace:** about 4 XP a minute against the 10 guideline (Morse is about 9). Raise it to about 2 XP per answer?
4. **Replace the Latin stage with recording choices** (see the word, pick which recording says it), keeping Latin as an option? Latin is a third script for a Hebrew reader. **Claude's pick (Adam: "do what you think is best"): yes, built.**
5. **Move لا to lesson 3 and ة to lesson 5.** لا already appears in words from lesson 3, and 399 deck words wait only on ة.
6. **Final k in Hebrew letters:** ךּ (as now) or כּ? An Israeli may read ך as *kh*. Claude couldn't verify a standard. **Adam: switch to כּ, built in #98.**
7. **Phrases the deck doesn't have:** السلام عليكم, صباح النور, إن شاء الله, "I don't understand". They'd have no recording. Add them anyway?
8. **Forms for a woman:** add "to a woman" lines (كيفك for a woman, etc.) to the phrase sets?
9. **The Guest rank:** the story says Guest needs reading *and writing*; the code asks only for the reading trial. Add the slate to it?
10. **Coverage reports** need a new dev dependency, `@vitest/coverage-v8` (free, MIT). OK to add?
