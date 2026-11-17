# 0041 — Fair shares of the free AI: a ceiling for the whole site

- **Status:** Accepted (Claude, 2026-11-17, task 2.2, #323; Adam's standing instruction to decide as he would. He can change any number: each is one line in the database.)
- **Date:** 2026-11-17
- **Builds on:** [ADR 0014](0014-groq-whisper-for-speech.md) (speech checks), [ADR 0036](0036-ai-partner-first-slice.md) (partner replies), [ADR 0038](0038-talking-with-the-regulars.md) (inn lines)

## Context

Three things in Waymark call a free AI key, and every player shares the same key:

| Allowance | Per player, per UTC day | Key it uses |
|---|---|---|
| Speech checks ("Say it", "Say your line") | 100 | Groq `whisper-large-v3` |
| Partner replies (the Radio Room) | 40 | Gemini `gemini-3.5-flash-lite` first, then Groq `qwen/qwen3.8-27b` |
| Inn lines and the Coach | 60 | Groq `openai/gpt-oss-120b` |

The per-player numbers were set when Adam was the only player. With friends (v2.0), five players at once draw on the same keys.

### What the providers say (read 2026-11-17)

- **Groq**, [console.groq.com/docs/rate-limits](https://console.groq.com/docs/rate-limits). Limits are "at the organization level, not individual users". Its table gives:
  - `openai/gpt-oss-120b`: 30 a minute, 1,000 a day, 8,000 tokens a minute, **200,000 tokens a day**.
  - `qwen/qwen3.8-27b`: the same numbers.
  - `whisper-large-v3`: 20 a minute, **2,000 a day**, 7,200 audio-seconds an hour, 28,800 a day.

  **Caveat:** the page now says these are "the base limits for the Developer plan", and the free plan's numbers sit behind a switch that can't be read from here. They match what our code was built against (the inn eval's "8,000 tokens a minute"). The exact free numbers are on the account's own page, console.groq.com/settings/limits, which only Adam can open.
- **Google**, [ai.google.dev/gemini-api/docs/rate-limits](https://ai.google.dev/gemini-api/docs/rate-limits), which now redirects to aistudio.google.com/docs/rate-limits. It lists **no Flash-Lite numbers**: "Rate limits … can be viewed in Google AI Studio", per project, resetting at midnight Pacific. What we know is from use: about 270 calls in a day hit no limit (ADR 0036). When Gemini refuses, the partner falls through to Groq.

### The sums for five players, everyone at their full allowance

| | Five players use | The key allows a day | Fits? |
|---|---|---|---|
| Speech checks | 500 | 2,000 requests | Yes |
| Partner replies | 200 | Gemini unknown; Groq backup 1,000 | Yes, even on the backup alone |
| Inn lines | 300 lines ≈ 300 × 800 tokens = **240,000 tokens**, more with retries | 200,000 tokens | **No** |

The inn is the tight one. A line costs about 800 tokens (the inn eval: 8,000 a minute is "about 10 lines"), and a line that breaks the rules is asked for once more. So the key's day covers about 200 lines in practice, not 1,000.

## Decision

1. **A ceiling for the whole site, per UTC day, for each of the three**, kept in the database (`site_usage`, `site_ceiling`, `take_site_share`; migration `20261229000000_site_ceilings.sql`). Each one stays below the key's own day, leaving room for retries, the eval scripts and the provider's clock (Google's day starts at midnight Pacific, ours at midnight UTC):
   - speech checks: **1,500** (of 2,000 requests);
   - partner replies: **500** (Groq's backup alone allows 1,000);
   - inn lines and the Coach: **150** (about 150 × 800 × 1.25 ≈ 150,000 of 200,000 tokens).
2. **The per-player numbers stay** (100, 40, 60). The site's ceiling is what guards everyone, and no one player can reach it alone: the biggest share is the inn's 60 of 150, which still leaves 90 lines for the rest.
3. **A claim checks the player first, then the site.** If the site's day is spent, the claim answers `-2`, and nothing is taken from the player's own allowance. The functions turn `-2` into the error `site-limit` (HTTP 429).
4. **What the player sees when the site's day is spent**, said plainly and pointing to what still works:
   - "Say it": "Everyone’s checks for today are used up. Judge it by ear; more tomorrow."
   - "Say your line" at the inn: "The listening is used up for everyone today. Type your line instead."
   - The inn: "The inn is full tonight: everyone’s talk has used up the day. Come back tomorrow."
   - The Radio Room: the operator's scripted line, as for any failure. The script was always the fallback.

## Consequences

- One player can't spend everyone's day, and a busy day ends with a friendly line instead of a provider error for all.
- On a day with many friends at the inn, someone may meet "the inn is full" before their own 60 lines. That is the honest limit of a free key.
- If Adam moves a key to a paid tier, or Groq's free numbers turn out higher, raise `site_ceiling` in a new migration: it's one line each.
- **For Adam to check once** (it can't be read from here): the free numbers on console.groq.com/settings/limits and aistudio.google.com/rate-limit. If the inn model's day is lower than 200,000 tokens, lower `chat` to match.
