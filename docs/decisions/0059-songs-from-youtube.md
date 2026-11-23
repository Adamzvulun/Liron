# 0059 — Songs from YouTube: Gemini listens to the link

- **Status:** Accepted (2026-11-23).
  - Adam: the player pastes the link and nothing else.
  - Explained songs are shared between friends.
  - Phase 15 comes after Phase 14.
  - "Figure out what's best" for the AI: Gemini, below.
- **Date:** 2026-11-23
- **Research:** [song-karaoke-2026-11-23.md](../research/song-karaoke-2026-11-23.md), Part 2 tests this on real songs.
- **Spec:** [song-karaoke.md](../game/song-karaoke.md)

## Context

Adam wants to paste a YouTube link and get the song transcribed, translated, transliterated and laid out as karaoke, with nothing else to do.

- **What we can't do.** Our app can't download or separate a video's audio: YouTube's developer policies forbid it, and download tools are blocked from cloud servers anyway (research Part 2, §B).
- **Captions.** YouTube's captions API serves only videos you can edit.
- **What Google offers.** The Gemini API takes a public YouTube link directly and listens to it on Google's side. It's a preview feature, free, with up to 8 hours of video a day on the free tier.

## Options

| | A. Gemini listens to the link (+ LRCLIB hint) | B. Download tool + Whisper | C. LRCLIB alone | D. A paid transcript service |
|---|---|---|---|---|
| **Player does** | Paste | Paste | Paste, and pick or paste words when it's missing | Paste |
| **Works from Vercel** | Yes, tested | No: YouTube blocks cloud servers (residential proxies cost money) | Yes | Yes |
| **Allowed** | Yes: Google's own documented feature | No: separates audio against YouTube's policies | Yes | Their terms |
| **Quality (tested)** | Near word-perfect with the hint; about 4 lines in 5 without | — | Varies; some Arabic records are merged lines, spelled by ear | — |
| **Timing to this video** | Yes | Yes | Only when the versions match | Varies |
| **Cost** | Free (preview) | Proxies | Free | Money |
| **Risk** | Free tier is often busy (503); the preview may change | Breaks often | Gaps | Lock-in |

## Decision

Option A, with C as the hint and the stand-in.

- **Listening.**
  - The server sends the YouTube link to Gemini, at the lowest video resolution, under a response schema.
  - LRCLIB's lyrics, when found, go with it as a hint.
  - Times are asked as `MM:SS.s` text and parsed by us. The tests showed Gemini writes 1:07 as "107" when asked for seconds.
- **Models.** A setting, not code, tried in turn on 503 or 429.
  - **Paid tier:** `gemini-3.6-flash`, then `gemini-3.5-flash-lite`.
  - **Free tier:** `gemini-3.5-flash-lite`, then `gemini-flash-lite-latest`. `gemini-3.6-flash` is kept for second listens, because its free tier is 20 requests a day per project (found in testing; research §K).
- **A Google Cloud project of the songs' own,** so they never share the Radio Room's quota (limits are per project).
- **Every listen is clipped to the first 10 minutes,** and each server call makes one attempt; the corner drives retries.
- **When everything is busy.** The song waits as *listening* in the shared songbook and is retried by itself; the player does nothing. If LRCLIB's synced lyrics match the video's length, they're shown meanwhile, marked as approximate.
- **Explaining: Claude.** Adam offered a Claude API key on 2026-11-23. Claude can't hear (the API takes text, images and PDFs), but it explains best.
  - `claude-opus-5-5`, at low effort, with structured output, gives the meaning, the Latin in our scheme and a gloss per word.
  - Gemini (`gemini-3.5-flash-lite`, text) and then Groq (`openai/gpt-oss-120b`) are the backups.
  - Song lyrics aren't anything a player typed, so ADR 0038's rule (the player's own Arabic never goes to Gemini's free tier) isn't touched.
- **Songs no one has written down.** When LRCLIB has nothing:
  - the song is heard twice, by two Gemini models;
  - Claude settles each word where they differ;
  - words it still doubts are underlined;
  - players can fix a word for everyone, with history and undo (research Part 3).
- **Sharing.** One `songs` row per video, readable by every signed-in player, written only by the server. A song is listened to once, ever.
- **Limits.**
  - 5 new songs per player a day.
  - Game-wide, new listening stops at 7 hours of video a day, under the free tier's 8.
- **Playback.** The YouTube IFrame Player on `youtube-nocookie.com`, at least 200 × 200 px, with nothing over it.
- **The CSP** gains `frame-src https://www.youtube-nocookie.com`, `script-src https://www.youtube.com` and `img-src https://i.ytimg.com`. Nothing else.

## Consequences

- **New outside dependencies.** Four: Gemini's YouTube feature (preview), YouTube's embedded player, LRCLIB and the Claude API. All but Claude are free, and all four are on the privacy page.
- **Money, Gemini.** The paid tier is recommended: about $0.03 a listen on 3.6 Flash ($0.05 from 2027), and what we send isn't used for Google's training. It needs billing on the songs' Google Cloud project, with a budget alert. Without it, the free tier works at lower quality and capacity.
- **Money, Claude.** The Claude API is paid: about $0.10–0.15 a song, once, since songs are shared (an estimate; 15.3 measures it). Adam puts the key in Vercel (`ANTHROPIC_API_KEY`), never in chat, and sets a monthly spend limit in the Claude Console. Without the key, the corner still works on Gemini and Groq.
- **The preview.** Google says pricing and limits "are likely to change". If it becomes paid, that comes to Adam as a question first, and LRCLIB-only (Option C) keeps the corner working meanwhile.
- **Third-party script.** The CSP allows it for the first time, site-wide, since Waymark is one page. The script is loaded only when the corner opens.
- **Copyright.** Lyrics are someone else's text. They live in our private database for the game's signed-in players, never in git or `content/`.
- **Supersedes** this ADR's Proposed draft of the same day (YouTube player plus LRCLIB, with the player pasting words when missing). Adam ruled that out.
