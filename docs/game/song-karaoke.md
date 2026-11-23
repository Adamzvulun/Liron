# Songs: learn the words through music (Phase 15)

- **Status:** Planned (2026-11-23), not built.
- **Research:** [song-karaoke-2026-11-23.md](../research/song-karaoke-2026-11-23.md).
- **Decision:** [ADR 0059](../decisions/0059-songs-from-youtube.md) (Proposed).
- **Epic:** Phase 15 in [PLAN.md](../process/PLAN.md).

## Why

- **Songs are how most people first hear Arabic.** A song is heard twenty times by choice; a lesson sentence, twice by duty.
- **What there is today.** The Arabic road teaches from the deck's recordings only, and nothing lets a player bring the Arabic they actually listen to.

## What it is

**The singer's corner**, a new corner of the caravanserai, next to the inn. It opens after chapter 5 of the Long Road In, so a player knows enough words for the song to light some up.

1. **Paste a link.** A YouTube link (`youtube.com/watch?v=`, `youtu.be/`, `music.youtube.com`, `/shorts/`).
   - The corner reads the title and channel (oEmbed).
   - It finds the song's synced lyrics on LRCLIB, by the title and the video's length.
   - When it isn't sure, it shows up to 3 matches to pick from ("Fairuz · Habaytak bel sayf · 3:41").
2. **Watch it, line by line.** YouTube's own player sits on top, at full width. The lyrics run underneath, never over it. Each line shows:
   - the Arabic, large, with the current line lit;
   - its Latin (or Hebrew letters, by the player's script setting);
   - its meaning in English, which can be hidden with one tap, to test yourself.
   - Inside the lit line, the current word is lit by estimate: the line's time is spread over its words by length. Where LRCLIB has word timings, those are used instead.
3. **Tap a word.** You see its gloss, its Latin, and whether you know it:
   - **known:** in your deck or lesson words, and in your reviews;
   - **met:** taught, but not yet reviewed;
   - **new.**

   Words the song gets from another dialect say so ("Egyptian: *ʕayez*; ours is *biddi*").
4. **Fix the timing.** −0.5 s / +0.5 s, and **This line is now** (tap while it's being sung to line everything up). The nudge is saved with the song.
5. **Keep this line.** Up to 10 lines per song become review cards (FSRS item `song:<songId>:<line>`). A card:
   - plays that line from the video (`seekTo` and play, stopping at the next line's time, all inside YouTube's player);
   - shows the line with one word missing, and 4 choices;
   - later, two words missing.
6. **Your songbook.** Every song you've opened, with how many of its words you know, as a share (*"You know 34% of Habaytak bel sayf"*). It grows as you learn, which is the point.
7. **No lyrics found.** **Paste the words** instead. You then time them yourself: play the song and tap **Next line** as each line starts. Pasted lyrics are explained the same way.

## Requirements (EARS)

1. When a player pastes a text, the system shall accept only a YouTube video link, and shall read the 11-character video id from it. Anything else gets "That isn't a YouTube video link".
2. When a link is accepted, the system shall read the title and channel through YouTube's oEmbed, and the length from the player (`getDuration()`), and shall look the song up on LRCLIB, preferring synced lyrics within ±3 s of the length.
3. Where more than one match is likely, the system shall show up to 3 and let the player pick. Where none is found, it shall offer *Paste the words*.
4. The video shall play only through the YouTube IFrame Player (`youtube-nocookie.com`), at least 200 × 200 px. Nothing shall be drawn over any part of it. The system shall never download, extract or record its audio.
5. When lyrics are chosen, the system shall ask the AI to explain them in batches of at most 10 lines: per line, the meaning, the Latin in the deck's scheme, and a gloss for each word; and per song, the dialect. Words found in the deck or lesson words shall take the deck's own spelling and meaning, not the AI's.
6. While the video plays, the system shall light the line whose time has come (with the player's nudge), and within it the word by estimate, or by LRCLIB's word timings where it has them. It shall check the time at least 4 times a second.
7. A player shall be able to explain **2 new songs a day**. Opening a song already in their songbook shall cost nothing. Game-wide, songs shall use at most half of the AI's daily tokens, so the inn keeps the rest. Over the limit: "The singer is resting. Two new songs tomorrow; your songbook is open."
8. The songbook shall store, in the player's own rows under RLS: the video id, the title, the LRCLIB id (or the pasted text, for pasted songs only), the nudge, the AI's notes per line, and the kept lines. Lyrics from LRCLIB shall be fetched fresh on each opening and not stored.
9. Song lyrics shall never be put in `content/`, in git, in tests or in a table another player can read.
10. *Keep this line* shall add an FSRS item `song:<songId>:<line>`, at most 10 per song. Its review shall play the line through the player, and shall be graded like the other choice drills (first try Good, second Hard, otherwise Again), as a result in the `listen` skill.
11. When the player's script setting is Hebrew letters, the Latin shall be shown through `latinToHebrew`.
12. Where the player is on a phone, the player shall stay at the top while the lines scroll beneath it.
13. The events shall be `song-open`, `song-line-kept` and `song-review`, with one daily contract ("Sing along: keep 2 lines", 15 gold).
14. The LRCLIB requests shall name the game (`Lrclib-Client: Waymark`), go one at a time, and honor `Retry-After`.

## Non-functional

- **Security.**
  - The CSP gains only what the player needs: `frame-src https://www.youtube-nocookie.com`, `script-src https://www.youtube.com` (the IFrame API loads its script from there, checked 2026-11-23) and `img-src https://i.ytimg.com`.
  - LRCLIB and oEmbed are called from our server function, so `connect-src` doesn't change.
  - The video id is checked against `^[A-Za-z0-9_-]{11}$` before it's used anywhere.
  - The AI's answer is checked against a schema before it's shown, and shown as text, never as HTML.
- **Privacy.**
  - Only the song's lyrics and title go to the AI, never anything the player typed.
  - YouTube sees the video play, as on YouTube itself; `youtube-nocookie.com` keeps its cookies off until play.
  - Both facts go on the privacy page.
- **Speed.** The first explained batch shows within 8 s on a phone. The rest fill in while the song plays.
- **Accessibility.**
  - Lines can be read with the video paused.
  - The lit line is announced politely, and can be turned off.
  - The Arabic has `lang="ar"` and `dir="rtl"`.

## Acceptance criteria

- **Given** a `youtu.be` link to a song LRCLIB has synced, **when** it's pasted, **then** the song plays in YouTube's player, and the lines light up in time with it.
- **Given** a song whose video has a long intro, **when** the player taps *This line is now* at the second line, **then** every later line lights up on time, and the nudge is still there tomorrow.
- **Given** a line with بيت, **when** the player has بيت in their reviews, **then** it's marked *known*.
- **Given** an Egyptian song, **then** its dialect is shown, and its Egyptian-only words are marked as not ours and aren't kept automatically.
- **Given** a player who has explained 2 new songs today, **when** they paste a third, **then** they get the resting message, and their songbook still opens.
- **Given** a video whose owner has turned off embedding, **then** the player says it can't play here, with a link to YouTube.
- **Given** a kept line, **when** it's due, **then** the review plays only that line, from the video, and asks for the missing word.
- **Tests:**
  - unit tests for the link parser, the LRC parser, the matcher (made-up records), the word-timing estimate, the nudge, the known-word marking and the limit;
  - a database test for the songbook rows and their RLS, and the daily limit;
  - a browser test with the player and LRCLIB mocked: paste, pick, play, nudge, keep, review, at phone size, with no overlay on the player.

## Errors

| Case | What happens |
|---|---|
| Not a YouTube link | "That isn't a YouTube video link." |
| The video can't be embedded (player errors 101/150) | "This video can't play outside YouTube," with a link to YouTube. The songbook doesn't keep it. |
| The video is private or deleted (player error 100) | "This video isn't there any more." |
| No lyrics on LRCLIB | *Paste the words* is offered. |
| LRCLIB says 429 or 503 | Wait for `Retry-After`, then try once more. Then: "The lyrics library is busy; try in a minute." |
| The AI fails, or answers outside the schema | The Arabic still plays and lights up. The meanings show "Not explained yet", with *Try again*, which costs nothing extra that day. |
| Over the daily limit | The resting message (requirement 7). |
| Signed out, or offline | The corner says it needs a connection, like the inn. |
| The lyrics are another language | "This song isn't in Arabic." The song isn't explained and isn't counted. |

## Implementation checklist

- [ ] ADR 0059 accepted (Adam's questions answered).
- [ ] CSP and privacy page updated; a test reads `vercel.json` and checks the CSP carries exactly the new hosts.
- [ ] `src/subjects/arabic/song/`: link parser, LRC parser, matcher, timing (with the nudge), word marking. All pure and unit-tested.
- [ ] `api/song.ts`: oEmbed, LRCLIB search and fetch, and the AI batches (Groq, schema-checked, in our Latin scheme), with the daily limit claimed in Supabase.
- [ ] Migration: `songbook` and `songbook_lines` (own rows, RLS), and `claim_song()` (per player and game-wide).
- [ ] The corner: paste, pick, the player (IFrame API, no overlay), the lines, word taps, the nudge, *Paste the words* and tap-to-time.
- [ ] *Keep this line*, the review card (`song:` items) and the events and contract.
- [ ] Docs: `ARCHITECTURE.md`, `RUNNING.md` (the limits), the privacy page and the guidebook page for the corner.

## Out of scope (kept, not dropped)

- **Hearing a song ourselves.** Whisper on a song file the player owns and uploads (research §4). Parked until a test on three songs shows it hears sung Arabic well enough.
- Sharing explained songs between friends (research §7, question 2).
- Singing back and being scored on it (that's the voice work of #342).
- Songs in the Morse track. A Morse "song" is the rhythm itself, and that's the Radio Room.
