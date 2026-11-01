# Hosted, free speech APIs (2026-11-01)

Question from Adam: Gemini's free tier caps the stronger models at 20 requests/day. Is there a **hosted, free** model, not Gemini and not running locally, that we can call by API, stick with, and that does the job (Palestinian Arabic transcription, and ideally pronunciation feedback)?

Legend: ✅ checked on the provider's own page · ⚠️ only from third-party pages or search snippets · ❓ unknown until we test.

## Candidates

| | Groq: Whisper large-v3 | Azure AI Speech: Pronunciation Assessment | Cloudflare Workers AI: Whisper v3 turbo | Hugging Face Inference |
|---|---|---|---|---|
| What it does | Speech → text | Scores your speech **against a reference text**: overall, per word, per phoneme | Speech → text | Hosts many models |
| Arabic | Whisper is multilingual. ❓ Palestinian dialect quality (research: zero-shot Whisper is much weaker on dialects than on MSA) | ✅ `ar-SA`, `ar-EG` (2 of 33 locales). No Palestinian locale. | same as Groq | depends on model |
| Pronunciation | ❌ like Gemini, it "fixes" words to real ones | ✅ phoneme **scores** for Arabic; phoneme **names** only for en-US/zh-CN. We know which letter we're testing, so scores are enough. ❓ how well it works on dialect text | ❌ | |
| Free limit | ✅ table: 20/min, **2,000 requests/day**, 7,200 audio-s/hour, **28,800 audio-s/day** (8 h). ⚠️ the docs page doesn't clearly say whether that table is the Free or Developer plan; third-party guides give the same numbers for Free. The account's limits page is authoritative. | ⚠️ F0: **5 audio hours/month** (official pricing page not fetched). ✅ F0 allows 1 request at a time (fine for one learner). Pronunciation assessment is priced like speech-to-text ✅. ⚠️ whether F0 includes it | ✅ 10,000 neurons/day ≈ **214 audio-min/day** | ⚠️ free monthly credits are $0.10, or were removed for free users in Oct 2026; conflicting reports. **Not viable.** |
| Data | ✅ by default no retention for inference, except up to 30 days for abuse and reliability logs. Zero-data-retention can be switched on. ⚠️ "no training" comes only from third-party summaries of Groq's terms | ❓ not checked yet | ❓ | |
| Account | free sign-up ⚠️ (no card, per third parties) | Azure free account. ⚠️ Azure usually asks for a **credit card** to verify identity; F0 itself doesn't bill | free Cloudflare account | |
| Reachable from our cloud session | ✅ (api.groq.com answers 401 without a key) | ✅ | ✅ | ✅ router |

For scale: our clips are about 1.7 s on average. Groq's 2,000 requests/day is about 100× what Gemini's stronger models allow. Azure's 5 h/month would be thousands of short checks.

## Recommendation (to test before deciding)
1. **Groq Whisper large-v3 for "did it understand you?"** It has the most headroom, one fixed model, and good data defaults. Risk: dialect quality, which we test on the same 50 deck clips and compare with Gemini flash-lite's 80%.
2. **Azure Pronunciation Assessment (`ar-SA`) for pronunciation.** It's the only hosted free option that actually scores sounds against a target. Risks: Saudi locale vs Palestinian text, F0 coverage, and the card at sign-up. Test it on the 15 synthetic right/wrong pairs from `v2.mjs` (Gemini TTS, no human voice): does the swapped word score clearly lower?
3. Skip Cloudflare (same model as Groq, less headroom) and Hugging Face (no real free tier).

Needs Adam: free accounts and keys as environment secrets (`GROQ_API_KEY`; `AZURE_SPEECH_KEY` + `AZURE_SPEECH_REGION`), and his OK to send the deck clips and synthetic clips to these two providers.

## Sources
- Groq rate limits ✅ https://console.groq.com/docs/rate-limits · data ✅ https://console.groq.com/docs/your-data · third-party free-tier guides ⚠️ https://spokenly.app/blog/free-speech-to-text-apis, https://www.developersdigest.tech/models/free-api/groq
- Azure language support ✅ https://learn.microsoft.com/en-us/azure/ai-services/speech-service/language-support?tabs=pronunciation-assessment · how-to and per-locale features ✅ https://learn.microsoft.com/en-us/azure/ai-services/speech-service/how-to-pronunciation-assessment · quotas ✅ https://learn.microsoft.com/en-us/azure/ai-services/speech-service/speech-services-quotas-and-limits · F0 5 h ⚠️ https://freetier.wiki/services/azure-ai-speech/
- Cloudflare pricing ✅ https://developers.cloudflare.com/workers-ai/platform/pricing/
- Hugging Face ⚠️ https://huggingface.co/docs/inference-providers/pricing, https://www.usagepricing.com/blueprint/activity/hugging-face-2026-10-15-free-inference-credits-removed
- Whisper on dialects ⚠️ https://arxiv.org/pdf/2511.18774, https://arxiv.org/pdf/2306.02902
