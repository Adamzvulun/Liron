# 0011 — Technical corrections (same features, simpler plumbing)

- **Status:** Accepted
- **Date:** 2026-11-01
- **Context:** A first "simplification pass" mixed technical fixes with feature cuts. Adam rejected the feature cuts, and the full vision stands. Only these technical corrections were approved. None of them removes anything the user gets.

> Amended by [0013](0013-speech-on-free-gemini.md): speech input checks understanding, not pronunciation. Amended by [0014](0014-groq-whisper-for-speech.md): speech input goes to Groq Whisper, not Gemini (#2 below).

## Decisions
| # | Correction | Amends |
|---|---|---|
| 1 | **Partners who message first:** ~~a regular website can't send phone notifications~~ ⚠️ *Corrected by fact-check: Android and desktop browsers **can** get web push from a regular website; iPhone needs the site added to the Home Screen first.* Decision for now: the messages wait in an **in-site inbox** shown when you open Waymark. No email notifications. | 0007 |
| 2 | **Speech input:** recorded audio is sent **directly to Gemini**, which understands audio. No separate speech-to-text service. The research task becomes "test Gemini on recorded Palestinian speech". | 0007, research |
| 3 | **AI endpoint** is a **Vercel serverless function** in the same repo and deploy, not a Supabase Edge Function. One less runtime. | 0004, 0005 |
| 4 | **No user-supplied API keys.** Shared key, with a daily cap per user. | 0004 |
| 5 | **Copyrighted content storage:** raw files in `sources/` in this **private** repo; imported by a script into Supabase and served only after login, never bundled into the site's files. (Resolved after Adam chose "start free".) | 0008 |

