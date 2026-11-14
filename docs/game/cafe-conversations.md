# Talking at the inn: Arabic conversations (E17), a proposal

- **Status:** proposal, written 2026-11-11 while Adam slept. **Decided 2026-11-14** in [ADR 0038](../decisions/0038-talking-with-the-regulars.md) (Adam asked Claude to answer open questions as he would), and its first slice is built: "Sit and talk" at the innkeeper's table. Every "my pick" below is easy to change.
- **Epic:** E17 Café conversations in the [roadmap](../process/ROADMAP.md) (M4).
- **Inputs:** [ADR 0007](../decisions/0007-partners-are-simulated-people.md) (partners are people, the silent Coach), [ADR 0004](../decisions/0004-free-llm-provider-agnostic.md) (free models behind our own function), [ADR 0036](../decisions/0036-ai-partner-first-slice.md) and [0037](../decisions/0037-ai-partner-answers-your-news.md) (the partner function, its cap and memory), the café cast draft in [discovery 03](../discovery/03-game-layer-and-partners.md) §4, and the regulars of "The Long Road In" ([arabic-core-words](arabic-core-words.md) §5).

## 1. What it is
You sit down at the inn and chat in Arabic with someone who lives there: a few short lines each, in Palestinian Arabic, about everyday things. They remember you. They never teach and never correct you. After the chat, a separate Coach (ADR 0007 §5) shows what you could have said better, and the words you missed go into your reviews.

## 2. The spike (2026-11-11, from the scratchpad)
Six learner turns, from "مرحبا" to a nonsense line ("blorp منيح كتاب"), sent to a café owner persona with the same rules on each model. The rules ask for Palestinian colloquial Arabic, never MSA, one or two short sentences and one simple question back, no teaching and no correcting. Nothing from the deck was sent.

| Model | Dialect | Problems seen | Speed | Free limit |
|---|---|---|---|---|
| Groq `openai/gpt-oss-120b` | Palestinian, natural, short | one odd word (مِتْنَفّس), a name slip (أبو صامِر) | 0.3–1.5 s | 1,000 requests and 8,000 tokens a minute (headers, 2026-11-11) |
| Gemini `gemini-3.5-flash-lite` | Mostly Palestinian | a Maghrebi word (قدّاش), a gender slip (هاد القهوة), a nonsense phrase (هاد بَيبي), lost track of where you were from, vowel marks on everything; two 503s | 0.6–6 s | about 270 a day with no cap hit (ADR 0013) |
| Gemini `gemini-3.5-flash` | — | the free quota ran out after a handful of calls; it thinks first, so short replies were cut off | 1–13 s | about 20 a day |
| Groq `qwen/qwen3.8-27b` (the radio backup) | Mixed | Egyptian words (عايزين), garbled phrases | 0.2–0.5 s | 1,000 a day |
| Groq `allam-2-7b` | Gulf-leaning | long speeches, offered to teach, broke character | 0.5 s | — |

All of them answered the nonsense line as a person would ("مش فاهم عليك، شو قصدك؟").

**What this means:** for Arabic, the best free model here is `gpt-oss-120b` on Groq, not Gemini. That also suits the data question: Groq keeps no inference data by default, while Gemini's free tier may use prompts to improve Google's products. It's a spike of one conversation per model, so the first slice should come with a small eval set (ADR 0004 asks for one): 20 learner lines, each model's answers checked against a list of MSA, Egyptian and Gulf words that mustn't appear.

## 3. The proposal (my picks)
- **Who you talk to:** the regulars at the innkeeper's table, one at a time: the regular of the chapter you're in, or any regular whose trial you've passed. They already have names, stories and a place (77 of them by now). This keeps the café inside the world instead of adding a second cast. Discovery 03's drafts (the café owner, the student, the grandmother, the taxi driver) map onto existing regulars or join them. (Question 3.)
- **Where:** a new "Sit and talk" at the innkeeper's table, once the Painted Sign is passed.
- **How a chat goes:** WhatsApp-style bubbles, your lines on one side, theirs on the other. They open with one line about their own story ("Omar's engagement is next week…"). A chat is at most 8 of your lines; then they have to go ("the bread is burning"), so a chat is short and the cap goes further.
- **What they say:** Palestinian Arabic, short, in Arabic script with vowel marks only where a word is hard. Tap a line to see it in Hebrew letters (we already have `inHebrewVowelled`), and tap again for an English gloss (one more call, so maybe only for the Coach). Their words lean on the words you've met: the prompt carries the chapter's theme and a few dozen words you know. (Question 5.)
- **What you type:** Arabic script, with an on-screen Arabic keyboard for phones and desktops without one. Hebrew letters as an input (transliterated to Arabic) is possible later. (Question 4.)
- **Memory:** after each chat, one short summary line per regular ("Adam is from Haifa, drinks his coffee without sugar"), kept in the Arabic progress in our Supabase, sent with the next chat. As in the Radio Room, nothing is kept at the provider by us.
- **The Coach, after the chat:** one call reads your lines and returns, for each, a better way to say it and the words you didn't know. It's shown as a card after the chat, never during it. The words go into your reviews (the word path's FSRS) when they're deck words; otherwise they're only shown. The Coach is the first thing that teaches, so it can't break character: it's a different voice, the innkeeper's notebook.
- **Cap:** 60 chat lines and 10 Coach debriefs a day, in the database like the partner's 40 (my guess; a chat of 8 lines is about 8 calls).
- **Rewards:** 10 XP a chat, an event `chat` for daily contracts ("Have a chat at the inn"), and an achievement for chatting with 10 different regulars (my picks).
- **Voice comes later** (ADR 0007: text first, then voice with Groq Whisper, ADR 0014), ordered, not cut.

## 4. How it's built
- `api/partner.ts` gets a new `kind`, `inn-chat`, with the regular's story (our content), the learner's name, the memory line, the last turns of this chat and the known-word hints. Groq's `gpt-oss-120b` first, Gemini flash-lite as the backup (or none; question 2). A second kind, `inn-coach`, for the debrief.
- `claim_partner_reply` already counts every reply; a chat would share the 40 or get its own counter (question 6).
- The checks the Radio Room does in the browser (`cleanNews`) become an Arabic check: Arabic letters, marks and punctuation only, at most 2 sentences, no Latin letters, no "AI" or "model" in any language. A reply that fails gets one retry, then "…" and the regular "has to serve a customer".

## 5. What it costs and shares
- **Money:** nothing, on both free tiers. If Groq's free tier changed, the backup or the cap would take the strain.
- **Data:** what you type in the chat, the regular's story, your on-air name, the memory line and known-word hints go to Groq (no data kept by default; switch on zero data retention in its Data Controls to be sure). Only when Groq fails would it go to Gemini's free tier (Google may use it). Nothing goes to either from the deck except, if you say yes to question 5, a few dozen single words you've met.
- **Lock-in:** none; the function speaks to two providers and the prompt is ours.

## 6. Questions for Adam
1. **Data:** may your chat lines go to Groq (no retention) for the inn's conversations, and to Gemini's free tier only as a backup? Or Groq only, with no backup, so your Arabic never reaches Google?
2. **Model:** Groq `openai/gpt-oss-120b` first, as the spike suggests, instead of Gemini flash-lite (ADR 0013's choice for the radio)? It would be a new ADR.
3. **Who:** the regulars at the innkeeper's table (my pick), or a separate café cast as in discovery 03 (names and details are yours)?
4. **Typing:** Arabic script with an on-screen keyboard (my pick), or Hebrew letters you type and we turn into Arabic, or both?
5. **Known words:** may the prompt carry a few dozen single words you've met from the deck (a personal-use licence; they'd go to Groq, not into the bundle or git)? Without them, the regulars speak simply but don't aim at your words.
6. **Cap:** 60 chat lines and 10 debriefs a day, on their own counter? Or another number?
7. **Your hand steps:** add `GROQ_API_KEY` in Vercel if it isn't there yet (the speech check uses the same key), and switch on zero data retention in Groq's Data Controls.
