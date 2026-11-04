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

## Already fixed (merged or in review)
| PR | Fix |
|---|---|
| [#88](https://github.com/Adamzvulun/Liron/pull/88) | **Security (High):** only the database writes rewards; the daily chest pays once; known subjects only, 3,000 XP a day, the time zone changes at most every 20 hours; the deck is read by licensees only ([ADR 0029](../../decisions/0029-database-is-the-only-writer-of-rewards.md)) |
| [#89](https://github.com/Adamzvulun/Liron/pull/89) | **Morse (High):** mashing keys no longer scores 100%; extras count as errors. **Coffee corner:** "Next:" names the right set |
| [#90](https://github.com/Adamzvulun/Liron/pull/90) | The microphone is always released (needed before the speech check); Morse audio contexts are closed |

## Still to fix (Claude, in this order)
1. **Content converters** (learning): stray letters in three number phrases (`tál(a)t __`); niqqud placed on the geresh instead of the letter (ח׳ַ shows a dotted circle in most fonts); initial ā; tanween order.
2. **Crashes and wrong messages** (QA, code): Practise goes blank if a lesson has no usable word (needs a guard and an app-wide error boundary); "Reach 90% to pass" after every set is done; "couldn't be saved" after a long session that did save; a lesson re-passes after it's done; a trial can be opened by URL before it's unlocked.
3. **Fair grading** (code, learning): spaced-repetition grades are all-or-nothing per session; coffee reviews are never graded "good"; Listen asks for ث/ذ/ق words the speaker says as s/z/g.
4. **Look and feel** (UX): the brass "Play again" buttons have white text at 1.4:1 contrast; the slate plaque covers the scroll's goal line on desktop; a wrong Koch answer isn't marked or announced; guild-coloured text is below AA contrast.
5. **Remaining security items:** M2 (CI env), M3 (security headers), L1 (audio links expire after an hour and then fail silently).
6. **Docs:** 39 small doc/code mismatches (STATUS stops at #82, stale "coming soon" text, CI.md); stale GitHub issues.
7. **Tests:** e2e flows that click the first choice and accept any outcome, so pass/fail gates are never checked end to end. Add deterministic pass and fail tests, and a fake database that keeps state.

## Bigger ideas the reviewers recommend (ordered, not dropped)
- **UX "focus mode":** keep activities inside the painted room with one slim bar, which gives the phone back about a third of its height. Plus a shared result card that animates the lamp or milestone you earned.
- **Read distractors with one lookalike letter swapped** (ب/ت/ث/ن/ي, ج/ح/خ…), since the dots are what's hard for Hebrew readers (Ibrahim, Eviatar & Aharon-Peretz 2002).
- **The slate should require the dots:** today ث can pass written as ب.
- **Show the spoken form on Read reveals** (قهوة is spelled with ق but said *gahwa* by this speaker).
- **Architecture before E10:** save each session in one all-or-nothing call (today it's 20–40 separate requests); move subject knowledge out of core (the Notice Board's quest list is hard-coded and promises rewards nothing pays).

## Decisions only Adam can make
1. **Prod keys in GitHub (security M1).** Any branch pushed to this repo can read prod's secret key. Options: (a) GitHub Environments, **a paid plan**; (b) keep prod's keys out of GitHub and run prod migrations by hand at release; (c) accept the risk. Claude recommends (b).
2. **The lesson gate.** "90% twice in a row" on 18 questions means at most one mistake per session; a learner who's truly at 90% passes two in a row only 20% of the time. Options: (a) 90% over the last 36 answers pooled; (b) the second pass on another day (best supported by research); (c) 85% per session. Claude recommends (b).
3. **Arabic XP pace:** about 4 XP a minute against the 10 guideline (Morse is about 9). Raise it to about 2 XP per answer?
4. **Replace the Latin stage with recording choices** (see the word, pick which recording says it), keeping Latin as an option? Latin is a third script for a Hebrew reader.
5. **Move لا to lesson 3 and ة to lesson 5.** لا already appears in words from lesson 3, and 399 deck words wait only on ة.
6. **Final k in Hebrew letters:** ךּ (as now) or כּ? An Israeli may read ך as *kh*. Claude couldn't verify a standard.
7. **Phrases the deck doesn't have:** السلام عليكم, صباح النور, إن شاء الله, "I don't understand". They'd have no recording. Add them anyway?
8. **Forms for a woman:** add "to a woman" lines (كيفك for a woman, etc.) to the phrase sets?
9. **The Guest rank:** the story says Guest needs reading *and writing*; the code asks only for the reading trial. Add the slate to it?
10. **Coverage reports** need a new dev dependency, `@vitest/coverage-v8` (free, MIT). OK to add?
