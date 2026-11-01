# 0004 — AI partner uses a free model behind a provider-agnostic adapter

- **Status:** Accepted (2026-11-01)
- **Date:** 2026-11-01

## Context
The AI that users chat with (Arabic conversation partner, Morse radio operator) must be free.
Free tiers change often and have rate limits. Some free tiers may use inputs for training. Once friends join, all their usage would share our quota.

## Options considered
1. **Gemini free tier (Google AI Studio).** Strong Arabic, including decent dialect, and the model morsehub used. Rate-limited, and free-tier data terms are weaker.
2. **Free models via OpenRouter / Groq / Cloudflare Workers AI** (open-weight models such as Llama, Qwen, Gemma). Arabic quality varies, especially for dialect.
3. **In-browser models (WebLLM).** Truly free and private, but heavy on phones and weak at Levantine Arabic.

## Decision
- A thin server-side adapter with the interface `chat(persona, learnerContext, messages)`. API keys never reach the browser.
- **Default: Gemini free tier. Fallback: one OpenRouter free model.**
- Per-user daily caps, so shared use stays within free limits.
- Optionally, a user can paste their own free API key, so heavy users don't drain the shared quota.
- **The Morse operator mostly doesn't need a big model.** A scripted QSO engine fills in standard exchanges, and the LLM adds personality and chit-chat.

## Adam's notes
- Gemini is confirmed as the default, with the free-model backup.
- We may **upgrade to a paid Gemini tier later**. A paid tier would also give better data terms and higher limits. The adapter makes that a config change.

## Consequences
- We need a small eval set (sample conversations) to check dialect quality before choosing a model. `prompt-engineer` covers this.
- We must re-check provider terms and limits at implementation time, since they change.
