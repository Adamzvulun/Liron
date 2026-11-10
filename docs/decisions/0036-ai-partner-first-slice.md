# 0036 — The AI partner's first slice: live operator news on Gemini flash-lite

- **Status:** Accepted (2026-11-10)
- **Date:** 2026-11-10
- **Amends:** [0004](0004-free-llm-provider-agnostic.md) (the backup provider), and builds [0007](0007-partners-are-simulated-people.md)'s first live part.

## Context
E15 is the AI adapter (ROADMAP M4). The Radio Room (E16, #223) was built without AI: each operator speaks only from their script. ADR 0007 asks for partners who feel like people, with a life and a memory, and ADR 0004 put them on a free model behind a server-side adapter.

On 2026-11-10 Claude put six questions to Adam (report 2026-11-09 §4l), with the providers' terms read from their own pages that day:
- **Gemini's free tier** ([terms](https://ai.google.dev/gemini-api/terms), effective 2026-03-23): Google uses free-tier prompts and responses "to provide, improve, and develop Google products", and "human reviewers may read, annotate, and process" them after disconnecting them from the account. The terms ask that no sensitive or personal information be sent. Use through a Cloud project with active billing counts as paid.
- **Groq** ([your data](https://console.groq.com/docs/your-data)): by default it doesn't keep inference data. Abuse logs are kept up to 30 days (opt-out in Data Controls), and any account can switch on zero data retention.

**Adam answered yes to all six** (2026-11-10). He also pointed back to the model already chosen: `gemini-3.5-flash-lite` (ADR 0013), the one stable free model.

## Options considered
1. **Wait and build the whole partner at once** (Arabic chat, voice, the Coach). It's big, and nothing would be tried for weeks.
2. **A first slice in the Radio Room** (chosen): the operator's news line in a ragchew is written live. It's short, in English, has a script to fall back on, and tests the whole path (function, cap, providers, memory) on something small.
3. **Gemini only, no backup.** One fewer moving part, but a Gemini outage or rate limit would leave only the script.

## Decision
- **What's live:** in a ragchew (not Dex's contest exchange), the last part of the operator's chat turn, after the weather, is their news, written live. Everything you copy for the log (call, report, name, town, temperature) stays scripted, so scoring never depends on the model.
- **Where:** `api/partner.ts`, a Vercel function (ADR 0011 #3). The prompt and the rules live there, not in the browser. The browser sends only the operator's story (our content), the name and town you keyed, your contact count and the operator's own past lines. It never sends your real name, email or voice.
- **Models:** `gemini-3.5-flash-lite` first (ADR 0013: about 270 calls a day with no cap hit, under 1 s an answer). `qwen/qwen3.8-27b` on Groq when Gemini fails or is rate-limited (of Groq's chat models it followed the rules best, answering in 0.2–1.2 s, measured 2026-11-10; its headers allow 1,000 requests a day). The OpenRouter backup in ADR 0004 is dropped: it's blocked from here and allows only 50 requests a day.
- **Cap:** 40 replies per learner per UTC day, taken in the database by `claim_partner_reply` (migration `20261127000000_partner_replies.sql`) before any provider is asked. After that, operators use their scripts.
- **Memory:** each operator's last 3 news lines with you are kept in the Morse progress (`radio.notes`), in our Supabase, and sent back with the next ask, so a story carries on ("CAT CAUGHT A MOUSE" → "CAT HIDING UNDER THE BED"). Nothing is kept at the providers by us.
- **In character (ADR 0007):** the rules forbid saying it's an AI, and the browser drops any line that does. It keeps only what Morse can send: at most 8 words and 50 characters, without sign-off words, signal reports or your name, which belong to other turns. If the line comes too late, is empty or breaks a rule, the script's line is sent. Nothing is ever shown as an error.
- **Said openly:** the Radio Room says that operators' news is written live by an AI (Google's Gemini). ADR 0007's illusion is kept inside the contact, not by hiding the fact.
- **Keys:** `GEMINI_API_KEY` and `GROQ_API_KEY` in Vercel, server-only. The function works with either one. Without both, it answers "not set up" and the room stays scripted.

## Consequences
- The second slice, operators answering the news you key, is [ADR 0037](0037-ai-partner-answers-your-news.md).
- The adapter is in place for the bigger partners (Arabic chat, the Coach): a new `kind` in `PartnerAsk`, its rules and prompt in the function, and its fallback in the subject.
- Free-tier terms can change. Re-read both pages before widening the partner (ADR 0004's rule), and before friends join (M5), when their text would go to Google too.
- The quality of a line can't be tested in CI. The unit tests fake the providers; a live run of the function from the scratchpad (12 lines from Gemini and 6 from Groq, 2026-11-10) checked tone, memory and the fallback.
