# 0059 — Songs from YouTube: YouTube's player, LRCLIB's lyrics

- **Status:** Proposed (2026-11-23). Waits on Adam's answers in [the research](../research/song-karaoke-2026-11-23.md) §7.
- **Date:** 2026-11-23
- **Spec:** [song-karaoke.md](../game/song-karaoke.md)

## Context

Adam wants to paste a YouTube link and get a karaoke-style walkthrough of the song, transcribed, translated and transliterated.

- **YouTube's terms.** The developer policies forbid separating or downloading a video's audio.
- **Captions.** The captions API only serves videos you can edit.
- **What's left.** Playing, timing and the words have to come from different places.

## Options

| | A. YouTube player + LRCLIB lyrics | B. Extract the audio and transcribe it with Whisper | C. Captions from the YouTube API |
|---|---|---|---|
| **Allowed?** | Yes: playback through the IFrame API, by its rules | **No**: YouTube's developer policies forbid separating audio | Only for videos we own |
| **Quality** | Human-written lines, mostly synced; Arabic coverage tested and good | Unknown for sung Arabic over music | — |
| **Cost** | Free, no key | Groq free tier | — |
| **Lock-in** | None. LRCLIB is open and has public dumps, and *Paste the words* works without it | — | — |

## Decision

Option A.

- **Playback.** The YouTube IFrame Player on `youtube-nocookie.com`, at least 200 × 200 px, with nothing drawn over it. Its clock (`getCurrentTime`) drives the karaoke, and `seekTo` plays a kept line in review. Its audio is never extracted.
- **Lyrics.** Found on LRCLIB by the oEmbed title and the player's duration, with up to 3 choices when unsure. Fetched fresh each time, never stored or committed. *Paste the words* is the fallback, with tap-to-time.
- **Explanation.** A new server function, `api/song.ts`, in `api/partner.ts`'s pattern:
  - it asks Groq (`openai/gpt-oss-120b`) for each line's meaning, its Latin in our scheme and a gloss per word, in batches of 10 lines, checked against a schema;
  - it holds a daily limit: 2 new songs per player, and at most half the day's tokens game-wide.
- **The CSP** gains `frame-src https://www.youtube-nocookie.com`, `script-src https://www.youtube.com` and `img-src https://i.ytimg.com`. Nothing else.
- **Data.**
  - A player's songbook is their own rows under RLS: the ids, the nudge, the AI's notes and their kept lines.
  - Only lyrics and titles go to the AI.

## Consequences

- **New outside dependencies.** Two: YouTube's embedded player (third-party script on one page) and LRCLIB. Both free, both without a key, both on the privacy page.
- **Third-party script.** The CSP allows it for the first time. It runs inside YouTube's iframe, but its loader runs on our page, so the CSP widening is real. It applies to the whole site: Waymark is one page, and moving between places never reloads the document, so a CSP for one route alone can't work. The script is loaded only when the corner opens.
- **Budget.** The Groq free budget is shared with the inn, so the limits matter. `RUNNING.md` says how to read them.
- **Copyright.** Lyrics are someone else's text. We show them to one player for study, and never store, commit or share them.
- **Whisper.** Transcribing a player's own audio file stays parked until it's tested on sung Arabic.
