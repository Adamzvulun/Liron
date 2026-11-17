# 0047 — The two finales and their capstones

- **Status:** Accepted (Claude, 2026-11-17, tasks 4.2 and 4.3, #334, #335; built to [the-road.md](../game/the-road.md) §4 and §5, under Adam's instruction to decide as he would). Adam can overturn any of it on the dev site.
- **Date:** 2026-11-17
- **Builds on:** [ADR 0011](0011-technical-corrections.md) (deck text stays private), [ADR 0013](0013-speech-on-free-gemini.md) (speech, and no pronunciation scoring), [ADR 0038](0038-talking-with-the-regulars.md) (talking with the regulars on Groq), [ADR 0006](0006-art-direction.md) (painted in the browser)

## Context

Neither road had an ending (PLAN gap 14), and neither learner goal had a test a player could pass (gap 15). The Road doc already wrote both finales: Forty Winters for the Signal Tower and The Stranger at the Gate for the Caravanserai. It gave their trials, screens, epilogues, titles and gear. Task 4.3 adds the rules for an honest capstone. The test must use only what Waymark can judge, and an eval set must show that the Arabic judge is consistent.

Building them raised a few questions the doc doesn't answer. This ADR records the answers.

## Decision

1. **Each finale is the last step of its road.** Forty Winters is step 75 in chapter 10. The Stranger at the Gate is step 275, in its own chapter 115. Both are `kind: 'finale'`. Each opens at its road's last rank (Ghost of the Ether, Storyteller). Each can be played again after a pass, but only the first pass sends its event.
2. **Rewards come from the database, as every reward does.** A first pass saves the event `trial-forty-winters` or `trial-stranger-at-the-gate`. `grant_milestones` then gives the gear: the beacon lens or the innkeeper's pen. `grant_achievements` gives the achievement and its title. `feed_from_achievement` tells the party feed. Neither finale is a questline chapter, so neither gives a chest.
3. **The Morse title is Keeper of the Hour.** The Road doc first wrote "Keeper of the Beacon", but Beacon Relit already gives that title for the five trials. Two achievements with one title would make the title mean nothing. "Keeper of the Hour" comes from the far voice's own words ("I kept the hour forty winters"). The Arabic title, Keeper of the Table, is unique as written.
4. **Both pieces of gear are held in the hand.** The Road doc's beacon lens reads like a pendant, but the avatar has no neck slot. Adding a slot for one item would be over-engineering. The lens is held up by its handle, and the pen is held like a raised reed.
5. **Forty Winters judges by machine only.** The player hears a plain-text message once at 20 wpm, with nothing to type while it plays. Then they answer three questions about it, with three choices each. Then they key a reply of about 25 characters, which the sending decoder must read right at 15 wpm or faster. There are six messages in `content/morse/finale.json`, so a retry never repeats the last one, and a retry isn't a memory test.
6. **The Stranger at the Gate has three parts.** All three must pass, in one sitting:
   - **Read.** A page of the innkeeper's guest book: 4 lines, each with 3 English meanings to pick from; 3 must be right. The lines are **our own sentences only** (`content/arabic/own-sentences.json`), for words the player has met and short enough for a page. They are never deck text, so nothing licensed reaches the bundle or the AI (ADR 0011).
   - **Write.** The stranger's name, from memory on the slate, judged as one shape. The slate's letter check draws the whole word as a single glyph. There are 3 tries. The eight names are short and common, with Latin and Hebrew spellings.
   - **Tell.** "Your Story": at least 6 and at most 8 of your lines, with the innkeeper asking and the whole table listening. The same model that plays the regulars (`openai/gpt-oss-120b` on Groq, ADR 0038) then reads the chat against a written rubric. The rubric asks three things: did you understand, did you answer in Arabic they could follow, and did you keep it going. The judge returns JSON. A pass needs all three parts and 6 lines of yours. The verdict's reason is shown to the player either way.
7. **It says plainly what it can't judge.** The rules on the intro screen say the judge can't hear you, so it never judges pronunciation (ADR 0013). The intro also says the innkeeper and the judge are an AI on Groq, and that what you type or say is sent there.
8. **The judge has an eval set, and it is kept.** `scripts/judge-eval.ts` holds 10 made-up chats: 3 that should pass and 7 that should fail. The fails are single words, answers that ignore the questions, the questions copied back, answers in Hebrew and English, letters with no meaning, bare answers that add nothing, and greetings only. Each chat is sent 3 times through the real function. The script fails below 90% right, or if any chat gets both a pass and a fail. It is run by hand, never in CI, because it uses the free quota. Run it again before changing `JUDGE_RULES` or the model. The results are in [judge-eval.md](../research/judge-eval.md).
9. **A test switch for Morse.** `?run=short` plays only the message's first word, as the Night Watch already does, so the end-to-end test doesn't wait for a whole message. The real game ignores it unless it is in the address.
10. **Each finale ends on a door, not a "come back never".** After a pass, the card's one button opens the station where every day has someone: the Radio Room for Morse, and Sit and talk for Arabic (task 4.1's loop). The ledger shows the distance to each capstone (task 1.6). For Morse it shows hearing and keying speed. For Arabic it shows words met, slate letters and your longest evening.

## Consequences

- Judging costs nothing extra. A judge call counts as one chat line against the player's daily lines (`claim_chat_line`), on Groq's free tier. No new account, key or bill is needed.
- The rubric is coarse on purpose. The eval shows it is steady on pass or fail, but not always on each part: one "single words" run marked "understood" true while the other two marked it false. A part's mark is shown as a hint, never as a grade.
- A model change can change verdicts. That is why the eval set must be run again first.
- Six messages, eight names and the guest book's own sentences are content. Adding more is a content change, with no code change.
