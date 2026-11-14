# 0038 — Talking at the inn: Arabic chats with the regulars (E17, first slice)

- **Status:** Accepted (2026-11-14, by Claude while Adam worked; he said to answer open questions the way he would. Every call below is easy to change: see "Undoing it".)
- **Date:** 2026-11-14
- **Builds on:** [0007](0007-partners-are-simulated-people.md) (partners are people, the silent Coach), [0004](0004-free-llm-provider-agnostic.md) (free models behind our own function), [0036](0036-ai-partner-first-slice.md) and [0037](0037-ai-partner-answers-your-news.md) (the partner function, its cap and its memory), and the proposal in [cafe-conversations.md](../game/cafe-conversations.md).

## Context
E17's proposal (2026-11-11) ended with seven questions for Adam. On 2026-11-14 he asked Claude to deal with questions as he would and keep working. Two of them are about data, which CLAUDE.md says must come to Adam as explicit questions. So where a question shares data, this ADR takes the option that shares the least. The one step that actually sends anything, putting the Groq key in Vercel, stays Adam's.

## Decision (the seven questions)
1. **Data: Groq only, with no backup.** Your chat lines go to Groq, which keeps no inference data by default. They never go to Gemini's free tier, which may use prompts to improve Google's products. When Groq fails or is busy, the regular "has to serve a customer" and the chat ends kindly. Adam already said yes to Gemini for the Radio Room's English news (ADR 0036). Arabic chat is more personal, though, and the spike found Gemini worse at Palestinian Arabic anyway.
2. **Model: `openai/gpt-oss-120b` on Groq**, the spike's best. The Radio Room keeps its own models (ADR 0036). The function sends no reasoning effort beyond "low", so replies stay fast.
3. **Who: the regulars of "The Long Road In"**, one at a time: the regular of your word chapter and every regular whose trial you've passed. Their name, story and outro are our own content (`questline.json`). No second cast.
4. **Typing: Arabic script**, with an on-screen Arabic keyboard (letters in rows, space, delete). A physical keyboard works too. **Typing in Hebrew letters** came the same day: a switch under the chat reads Hebrew letters as Arabic with the letter table's own bridge (ח׳ is خ, a word-final ה is ة), shows "They read: …" as you type, and is remembered (`chat.hebrew`). What's sent is always Arabic.
5. **Known words: no deck text in the prompt.** The prompt carries the chapter's theme and our own English glosses of its words (`core-words.json`'s glosses are ours), so the regular talks about things you've learned. No Arabic from the deck leaves the app.
6. **Cap: 60 chat lines a day, on their own counter** (`claim_chat_line`, migration `20261208000000_chat_lines.sql`), apart from the radio's 40. A chat is at most 8 of your lines, so it allows about 7 chats a day.
7. **Adam's hand steps:** add `GROQ_API_KEY` in Vercel (the speech check needs it too), and switch on zero data retention in Groq's Data Controls. Until the key is there, "Sit and talk" says the regulars are busy, and nothing is sent.

## Also decided
- **Where:** "Sit and talk" at the innkeeper's table (a button beside "Start a session", and `?open=chat`), once the Painted Sign is passed. You give the name the regulars know you by once.
- **A chat:** the regular opens with one line from their own story. You answer, up to 8 times. Then they have to go. Their lines are in Arabic script; tap one to see it in Hebrew letters (`inHebrewVowelled`).
- **The check (`cleanArabic`):** Arabic letters, marks, digits and punctuation only, at most 3 sentences (a greeting like "أهلا!" counts as one) and 160 characters, no Latin letters, and never "AI" or "model" in Arabic or English. A reply that fails is asked for once more, then the chat ends kindly.
- **Grammar of gender:** each regular is told "You are a woman" or "You are a man" (the `she` flag in `questline.json`), since the rule alone let a woman say فاهم in the live run.
- **Memory:** the last 3 things you said to each regular are kept in the Arabic progress (`chat.told`, with your name and a count of chats), in our Supabase, and sent with the next chat, as in the Radio Room (ADR 0037).
- **Said openly:** the table says that the regulars' lines are written by an AI (Groq) and that what you type goes to it, so type nothing private.
- **Rewards:** 10 XP for a chat of at least 3 lines.
- **Glosses (added 2026-11-14):** tapping a regular's line shows, under the Hebrew letters, the words of it that are on the word path or in a reviewed letter lesson, each with our own gloss (never the deck's English). The match is made in the browser from the deck you've already loaded (`glossaryFrom`, `glossesIn` in `innChat.ts`, which look past و, ال, ب and the like in front of a word), so nothing more is sent.
- **Reputation (added 2026-11-14):** each regular counts your chats with them (`chat.met`, a chat counts when you said at least one line). The pick list shows *New face*, *Knows you* (1 to 4 chats) or *Old friend* (5 or more), and the count goes with the next chat (`met`), so the regular greets a first-timer as someone new and an old friend warmly. `OLD_FRIENDS` (5) in `api/partner.ts` and `standingWith` in the app must agree.

## Not in this slice (ordered, not cut)
The regulars speaking their lines aloud (no free Arabic voice yet).

**Added the same day: the Coach** (ADR 0007). After a chat, "Ask the Coach" sends the same chat once more to Groq (kind `inn-coach`, nothing new leaves the app, one chat line). The answer is JSON with at most 3 tips, each one of your lines, how a Palestinian would say it, and why in one English sentence. `cleanTips` keeps a tip only if it's about one of your own lines and its better line passes `cleanArabic`. The Coach thinks at medium effort (about 1 s): at low effort it "fixed" أنا يعمل to the Standard أنا أعمل, so its rules now name the Palestinian form against each Standard one (بشتغل, بدّي, شو, منيح, آه).

**The Coach's eval** (`node scripts/inn-eval.ts --coach`): 6 wrong lines must get a Palestinian tip and 4 fine ones none. The first runs gave a Lebanese هيدا, an Egyptian عيش and a spelling-only "fix", so: `cleanArabic` now refuses giveaway words of other varieties (ماذا, سوف, أريد, عايز, دلوقتي, كده, شلون, وايد, شنو, هيدا) in any reply or tip, `cleanTips` drops a tip that only changes alifs, hamzas or marks, and the Coach answers at temperature 0.3. It then got 10 of 10, and the regulars' eval kept 20 of 20. A known weakness: a tip can drift in meaning (هذا بيتي became هالبيت, "this house").

**Then the Coach's phrases** (ADR 0007's "→ FSRS"): every tip the Coach gives is kept in the Arabic progress (`chat.tips`, the newest 30) and becomes a spaced-repetition item `tip:<hash>`, first graded Good. When one is due, "The Coach's phrases" at the table shows what you said and asks how a Palestinian would say it; you check yourself ("Not yet" is Again, "I had it" is Good). Nothing is sent to Groq for this.

**And your voice** (ADR 0014): "🎙 Say your line" records one line and sends it to Groq Whisper through `api/understood.ts`, the same check as "Say it" (Adam approved it in PR #87), with its own daily cap. What Whisper heard lands in the text box, in Arabic, for you to fix before you send it. The table's said-openly note now names the microphone too.

**Also added the same day:** a daily contract, "Sit and talk with a regular at the inn" (15 gold, offered once you've had a chat), and the achievement **Known at the Inn** (10 different regulars, 3 gems, the title *the Well-Spoken*), from the events `inn-chat` and `inn-regular` (migration `20261209000000_inn_chat_rewards.sql`).

## Consequences
- The first time a learner's own Arabic leaves the app. It goes to one provider that keeps nothing by default.
- Before friends join (M5), re-read Groq's terms, as ADR 0036 already says.
- **Groq's free limits for `gpt-oss-120b`** (read from its response headers, 2026-11-14): 8,000 tokens a minute and 1,000 requests a day, per key. A line costs about 660 tokens, so the whole app can make about 10 inn lines a minute. That's plenty for one learner; before friends join (M5), check it again.
- **The eval set** (`scripts/inn-eval.ts`, added 2026-11-14, run by hand): 20 chats (10 openings, 10 answers, including nonsense), checked by `cleanArabic`, a list of MSA, Egyptian and Gulf giveaways (ماذا, إيه, شلونك, عايز…), and masculine "I am" words from a woman. The first run kept 16 of 20 (an Egyptian إيه, a Gulf شلونك, a woman saying "مش فاهم"), so the rules now name the Palestinian word for each, and give the woman's form of "I don't understand". After that it kept 19 of 20. Openings now tell one small thing from the regular's day, and a greeting counts as its own sentence, so a line may have 3.

## Undoing it
Remove the "Sit and talk" button in `WordLessons` (its `onChat` prop) and the `chat` view in `Caravanserai.tsx`. The `inn-chat` kind, the counter and `chat` in the progress can stay unused. Adding Gemini as a backup is one line in `api/partner.ts`.
