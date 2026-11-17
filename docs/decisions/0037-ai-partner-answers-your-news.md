# 0037 — The AI partner's second slice: operators answer the news you key

- **Status:** Accepted (2026-11-10, by Claude while Adam slept; he said to make the calls he'd make. Easy to undo: see "Undoing it".)
- **Date:** 2026-11-10
- **Builds on:** [0036](0036-ai-partner-first-slice.md) (the first slice: operators' news), [0007](0007-partners-are-simulated-people.md) (partners are people).

## Context
ADR 0036 made the operator's news line live. Its "next slices" were free-form replies to what the learner keys and operators who ask about the learner's news. Until now you only keyed set lines (your call, your report, your sign-off), so nothing you said could change the talk.

This slice sends something new to the providers: a short line the learner keys freely. ADR 0036's terms check still holds (read 2026-11-10): Gemini's free tier may use prompts to improve Google's products and humans may read them, and the terms ask that no personal or sensitive information be sent. Groq keeps no inference data by default. Adam is the only learner until M5.

## Options considered
1. **Keep the learner's text away from the AI** (only set lines). Safe, but the operators can never react to you, which is the point of ADR 0007.
2. **A free turn with a canned answer** ("R R FB"). No data leaves, but it reads as a machine.
3. **A free turn the operator answers live** (chosen), skippable, not scored, with a clear note.

## Decision
- **The free turn:** in a ragchew, after the operator's chat and before you sign, you key a few words of your own news (`FreeTurn`, the key with no set line; Done ends it). It isn't scored, and "Skip: no news today" passes it. Dex's contest contact has none. A ragchew is now 8 turns.
- **The answer:** what the decoder read (Morse characters only, at most 60, `cleanHeard`) goes to `api/partner.ts` as a `radio-reply` ask, with the operator's own news from this contact. Their sign-off turn starts with the answer (`FB ON UR NEW JOB, GL <BT> …`), cut to 7 words and 44 characters by `cleanReply`; it may say your name and wish you GL. With fewer than 3 letters read, nothing is asked. If the answer doesn't come within 6 seconds, or breaks a rule, the sign-off starts with a plain `R R FB`. A garbled read gets "SRI NOT ALL COPY, BUT FB" from the model, never a correction.
- **The rules** (`REPLY_RULES`): 2 to 6 words, no question, no sign-off words, never add facts about the learner's life, SRI only for bad news or a missed copy, never say it's an AI.
- **Memory:** the last 3 lines you told each operator are kept in `radio.told`, in our Supabase, and sent with both kinds of ask (`told`). The news rules let an operator now and then ask about them ("HW IS UR SICK DOG NOW OM") and forbid inventing how your story turned out.
- **Cap:** each answer takes one of the 40 daily replies, so a ragchew with news costs 2.
- **Said openly:** the free turn says "Don't key anything private: it goes to the AI that writes their answer," and the room's note now says the answer to your news is written by the AI too.

## Measured (2026-11-10, a live run from the scratchpad)
Five made-up lines, including a garbled one ("NEW EIT TEI ANTENA") and noise ("TTT"), on each provider. Gemini answered all of them in character ("CONGRATS ON UR NEW JOB OM GL", "SRI ABT UR DOG, GET WELL SOON", "SRI NOT ALL COPY, BUT FB"), in 0.5–6.3 s. Groq answered in 0.1–0.8 s. Before the SRI rule it was sorry for good news ("SRI ON UR NEW PORT JOB"); after it, it wasn't. Asked for news with `told`, both asked after the sick dog.

## Consequences
- Your own words now reach Google's free tier. That's fine for Adam now; before friends join (M5), re-read the terms and decide whether their free turns go to Gemini or only to Groq (zero data retention), as ADR 0036 already says.
- Gemini can take several seconds. **Amended 2026-11-11:** the eval set (`scripts/partner-eval.ts`, below) measured Gemini at 5–8 s for answers against the room's 6 s wait, and Groq under 1 s. So for `radio-reply` the function gives Gemini 3 s (`REPLY_GEMINI_MS`) before it asks Groq. With both keys, the eval kept all 12 lines, every answer within 3.3 s.
- **The eval set** (ADR 0004 asks for one): `scripts/partner-eval.ts`, run by hand with the keys, never in CI. It sends 7 news asks (with and without memory) and 5 answers (plain, garbled and noise) to each provider alone and to both, applies the browser's checks, and fails below 80% kept in the production setup.
- The next slices (ordered, not cut): the Arabic partner and the Coach (ADR 0007), as new `kind`s.

## Undoing it
Drop `{ kind: 'free' }` from `contactSteps` in `onAir.ts`: the contact goes back to 7 turns and nothing is asked. `radio.told` is optional and can stay.
