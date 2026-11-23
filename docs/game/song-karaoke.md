# Songs: learn the words through music (Phase 15)

- **Status:** Planned (2026-11-23), not built.
- **Research:** [song-karaoke-2026-11-23.md](../research/song-karaoke-2026-11-23.md). Part 2 has the tests on real songs. Part 3 covers songs no one has written down, and Claude.
- **Decision:** [ADR 0059](../decisions/0059-songs-from-youtube.md), Accepted.
- **Epic:** Phase 15 in [PLAN.md](../process/PLAN.md), after Phase 14.

## Why

- **Songs are how most people first hear Arabic.** A song is heard twenty times by choice; a lesson sentence, twice by duty.
- **What there is today.** The Arabic road teaches from the deck's recordings only, and nothing lets a player bring the Arabic they actually listen to.

## The one rule (Adam, 2026-11-23)

**The player pastes a link, and that's all.** Everything else happens on its own:
- the song is listened to and written down;
- it's timed, translated and transliterated;
- it's laid out as karaoke.

No picking a match, no pasting words, no setting the timing.

## What it is

**The singer's corner**, a new corner of the caravanserai, next to the inn. It opens after chapter 5 of the Long Road In, so a player knows enough words for the song to light some up.

1. **Paste a link.** Any YouTube link (`watch?v=`, `youtu.be/`, `music.youtube.com`, `/shorts/`, `/embed/`). The corner shows the video's title and starts at once.
2. **The singer listens.** On our server:
   - **The shared songbook comes first.** If any player has opened this video before, the song is ready at once and costs nothing.
   - **Otherwise LRCLIB is asked** for the song's lyrics, by the video's title and length. That takes under a second.
   - **Then the link goes to Gemini** (Google's own YouTube-link feature, no download), with LRCLIB's words, when found, given as a hint. Gemini writes down every sung line:
     - in Arabic script, in the singer's own dialect;
     - repeats included;
     - with its start and end in *this* video.

     The hint is only for words that are hard to hear. Gemini writes what's actually sung, as this video sings it.
3. **The words are settled.** In the tests (research, Part 2):
   - **With the hint,** a Fairuz song came back near word-perfect.
   - **Without it,** about four lines in five were exact, and the rest were near-sounding words.
   - **Songs LRCLIB doesn't have** are marked *heard by ear* in small letters, since a machine can mishear a word.
4. **Songs no one has written down.** When LRCLIB has nothing, the song is heard twice, by two different models. Claude settles every word where the two differ, from the meaning and the dialect. Words it still doubts get a faint dotted underline. In the tests this left about 2 small mistakes in 39 lines (research, Part 3). Two listens cost two of Gemini's tries, so this runs only when there's no LRCLIB hint.
5. **They're explained.** By Claude, per line: the meaning in English, the Latin in the deck's scheme, a gloss for each word, and the song's dialect. Words found in the deck or lesson words take the deck's own spelling and meaning.
6. **Watch it, line by line.** YouTube's own player sits on top, at full width. The lyrics run underneath, never over it. Each line shows:
   - the Arabic, large, with the current line lit;
   - its Latin (or Hebrew letters, by the player's script setting);
   - its meaning in English, which can be hidden with one tap, to test yourself.
   - Inside the lit line, the current word is lit by estimate (the line's time spread over its words by length).
7. **Tap a word.** You see its gloss, its Latin, and whether you know it:
   - **known:** in your deck or lesson words, and in your reviews;
   - **met:** taught, but not yet reviewed;
   - **new.**

   Words from another dialect say so ("Egyptian: *3āyez*; ours is *bíddi*").

   **Fix this word.** Anyone who hears it differently can correct it. Songs are shared, so the fix is for everyone. It's kept in the song's history, can be undone, and the line is explained again.
8. **Keep this line.** Up to 10 lines per song become review cards (FSRS item `song:<videoId>:<line>`). A card:
   - plays that line from the video (`seekTo` and play, stopping at the next line's time, inside YouTube's player);
   - shows the line with one word missing, and 4 choices;
   - later, two words missing.
9. **Your songbook.** Every song you've opened, with how many of its words you know, as a share (*"You know 34% of Habaytak bel sayf"*). It grows as you learn, which is the point.
10. **If it's a little off.** A timing nudge (−/+ 0.5 s) is there for anyone who wants it. It's never needed to start.

## While the singer is busy

Gemini's free tier is sometimes busy: it answers "high demand" (503). Part 2 of the research measured how often. The player still does nothing:

- **The server tries the next model.** The order is a setting, not code, because Google renames models often (`gemini-2.5-flash` was already gone for new keys on 2026-11-23).
  - **Gemini's paid tier is the plan** (Adam, 2026-11-23; about $0.03 a listen): `gemini-3.6-flash` first, then `gemini-3.5-flash-lite`.
  - **Only if billing lapses, the free tier:** `gemini-3.5-flash-lite` first, then `gemini-flash-lite-latest`. `gemini-3.6-flash` allows only 20 requests a day per project, so it's kept for the second listen on songs without lyrics, with our own count stopping at 15 a day.
- **One attempt per server call.** The corner's retries drive the next attempt, so no call outlives Vercel's time limit.
- **One listen at a time, game-wide** (a lease in `claim_song()`), so two friends pasting the same new song don't pay for it twice, and bursts don't hit the per-minute limits.
- **The songs' calls use their own Google Cloud project** (limits are per project), so a busy evening of songs never uses up the Radio Room's Gemini quota.
- **If all are busy,** the song is saved as *listening* in the shared songbook. The corner says "The singer is learning this one…" with a small animation.
  - It retries on its own: at 30 s, 1, 2, 4 and 8 minutes while the page is open.
  - Then whenever anyone opens the corner.
- **If LRCLIB has synced lyrics whose length matches the video (±3 s),** the song is shown at once with LRCLIB's own timings, marked *timing approximate*, while Gemini is busy. When Gemini answers, the lines and times are replaced without a reload.

## Requirements (EARS)

1. When a player pastes a text, the system shall accept any YouTube video link and read the 11-character id from it. Anything else gets "That isn't a YouTube video link".
2. When a link is accepted, the system shall need nothing more from the player to play the song with timed, explained lines.
3. When a video id is already in the shared songbook and ready, the system shall show it without calling Gemini or LRCLIB.
4. When a video id is new, the system shall first look the song up on LRCLIB by title and length (±3 s; plain or synced). Then it shall send the YouTube link to Gemini, clipped to the first 10 minutes (`video_metadata.end_offset: 600s`), at the lowest video resolution (or the audio layer alone, where the API offers it), with LRCLIB's words as a hint when found. It shall ask for every sung line, repeats included, with its start and end as `MM:SS.s` text, under a response schema.
5. The system shall parse each time from `MM:SS.s`, and shall reject an answer whose times don't run in order or run past the video's length (from `getDuration()`), retrying once. Where LRCLIB had no lyrics, the lines shall be marked *heard by ear*.
6. When Gemini answers 503 or 429, the system shall try the next model in the list. When every model is busy, it shall save the song as *listening* and retry by itself as above, with no action from the player.
7. The video shall play only through the YouTube IFrame Player (`youtube-nocookie.com`), at least 200 × 200 px, with nothing drawn over any part of it. The system shall never download, extract or record its audio itself. Listening is done by Gemini from the public link.
8. The system shall explain the lines with Claude (`claude-opus-5-5`, low effort, structured output), falling back to Gemini (`gemini-3.5-flash-lite`, text) and then Groq (`openai/gpt-oss-120b`), in batches of at most 20 lines. Per line: the meaning, the Latin in the deck's scheme and a gloss per word. Per song: the dialect. The answer shall be checked against a schema.
9. While the video plays, the system shall light the line whose time has come (with any nudge), and within it the word by estimate. It shall check the time at least 4 times a second.
10. The shared songbook (`songs`) shall hold, per video: the title, the lines, their times, the source (LRCLIB or heard), the explanations and the state (*listening*, *ready*, *failed*). Every signed-in player can read it (Adam, 2026-11-23), and only the server function writes it. Each player's own `songbook` rows hold which songs they've opened, their nudge and their kept lines.
11. Song lyrics shall never be put in `content/`, in git or in tests.
12. A player shall be able to start **5 new songs a day**. Opening a ready song costs nothing. Game-wide, the system shall stop sending new videos to Gemini at 7 hours of video in a day (a bounded bill, and under the free tier's 8 if billing lapses). Over the limit: "The singer is resting. Your songbook is open; new songs tomorrow."
13. *Keep this line* shall add an FSRS item `song:<videoId>:<line>`, at most 10 per song. Its review shall play the line through the player, and shall be graded like the other choice drills (first try Good, second Hard, otherwise Again), as a result in the `listen` skill.
14. When the player's script setting is Hebrew letters, the Latin shall be shown through `latinToHebrew`.
15. The events shall be `song-open`, `song-line-kept` and `song-review`, with one daily contract ("Sing along: keep 2 lines", 15 gold).
16. The LRCLIB requests shall name the game (`User-Agent: Waymark (…)`), go one at a time, and honor `Retry-After`.
17. Where LRCLIB had no lyrics, the system shall listen with two different Gemini models and shall send both transcripts to Claude to settle each differing word. Words Claude marks as doubtful shall be shown with a dotted underline.
18. When a player fixes a word (one word, at most 30 Arabic letters, 20 fixes a day per player), the system shall save the fix to the shared song, with the player and the time, keep the earlier text in the song's history, let any player undo it, and explain that line again.
19. The system shall explain each distinct line once; repeated lines (75% of one test song, 28% of another) reuse the first explanation.
20. Every Latin string shall pass through the scheme converter (ħ→ɧ, ʕ→3, ṣ→ʂ, ḍ→ɖ, ṭ→ʈ, ẓ→ʐ, ġ→ɣ, θ→ŧ, ð→đ, ʃ→š, ə→e and the like), and then the checker (the scheme's letters, spaces, hyphens and punctuation only). A line that still fails shall be asked again on its own, once, and then shown without Latin. Lines in another language (English, French) get no Latin.
21. A line that holds a player's fix shall be explained by Claude or Groq only, never Gemini (ADR 0038).
22. Claude's spend shall be counted in `songs_budget` each month. At 80% of the month's budget, explaining shall fall back to Gemini text, then Groq.

## Non-functional

- **Security.**
  - The CSP gains only what the player needs: `frame-src https://www.youtube-nocookie.com`, `script-src https://www.youtube.com` (the IFrame API loads its script from there, checked 2026-11-23) and `img-src https://i.ytimg.com`.
  - Gemini, LRCLIB and oEmbed are called from our server function, so `connect-src` doesn't change.
  - The video id is checked against `^[A-Za-z0-9_-]{11}$` before it's used anywhere.
  - Every AI answer is checked against a schema and shown as text, never as HTML.
- **Privacy.**
  - Only the video's link, its lyrics and its title go to Gemini, Claude (and Groq as backup), never anything the player typed, except a word a player fixes, which is part of the song.
  - YouTube sees the video play, as on YouTube itself.
  - Both facts go on the privacy page.
- **Speed.**
  - A song in the shared songbook opens at once.
  - A new song is heard in about 7 s on a good day (6.4 s for a 5-minute song in the tests).
  - The explanation fills in while the song plays.
- **Function time.** Vercel's limit for a function is checked when built. The work is split into short calls (listen, then explain in batches), so no single call is long.
- **Accessibility.**
  - Lines can be read with the video paused.
  - The lit line is announced politely, and can be turned off.
  - The Arabic has `lang="ar"` and `dir="rtl"`.

## Acceptance criteria

- **Given** a `youtu.be` link to a song no one has opened, **when** it's pasted, **then** the player does nothing else. Within about 10 s on a good day, the song plays in YouTube's player, and the lines light up in time with the video.
- **Given** a song LRCLIB has, **then** the heard lines use LRCLIB's spelling where it's sung that way, timed to this video's intro and edit.
- **Given** a song LRCLIB doesn't have, **then** it's heard twice and settled by Claude, the lines are marked *heard by ear*, and doubtful words are underlined.
- **Given** a player fixes a word, **when** another player opens the song, **then** they see the fix, and either can undo it.
- **Given** Gemini answers 503 on every model, **then** the corner shows "The singer is learning this one…", and the song appears by itself when a retry succeeds, with no tap.
- **Given** a song another player opened yesterday, **when** a third player pastes its link, **then** it opens at once and uses none of that player's daily songs.
- **Given** a line with بيت, **when** the player has بيت in their reviews, **then** it's marked *known*.
- **Given** an Egyptian song, **then** its dialect is shown, and its Egyptian-only words are marked as not ours.
- **Given** a video whose owner has turned off embedding, **then** the corner says it can't play here, with a link to YouTube.
- **Given** a kept line, **when** it's due, **then** the review plays only that line, from the video, and asks for the missing word.
- **Tests:**
  - unit tests (with **made-up** lyrics only) for:
    - the link parser;
    - the LRC parser;
    - the `MM:SS.s` parser and the order check;
    - the model fallback order;
    - the retry schedule;
    - the word-timing estimate;
    - the known-word marking;
    - the limits;
  - a database test for `songs` (read by all signed-in players, written by the server only), the `songbook` RLS and the daily limits;
  - a browser test with YouTube, Gemini and LRCLIB mocked:
    - paste, then the *listening* state, then ready by itself;
    - play, the lines light up, a word tap, keep a line;
    - at phone size, with no element over the player.

## Errors

| Case | What happens |
|---|---|
| Not a YouTube link | "That isn't a YouTube video link." |
| The video can't be embedded (player errors 101/150) | "This video can't play outside YouTube," with a link to YouTube. |
| The video is private, unlisted or deleted | "This video isn't public, so the singer can't hear it." (Gemini reads public videos only.) |
| Gemini busy on every model | *Listening*, with automatic retries (above). |
| Gemini answers but hears no singing | "No singing in this one." The song is saved as *failed*, so no one pays for it again. |
| The lyrics aren't Arabic | "This song isn't in Arabic." It's saved as *failed*, for the same reason. |
| LRCLIB says 429 or 503 | Honor `Retry-After` once. Then go on without it (Gemini's lines). |
| The explanation fails | The Arabic still plays and lights up. The meanings fill in on the next retry. |
| Over a daily limit | The resting message (requirement 12). |
| Signed out, or offline | The corner says it needs a connection, like the inn. |

## Implementation checklist

- [ ] **Adam's setup, when 15.3 starts** (keys only in Vercel, never in chat):
  - a new Google Cloud project for songs, with billing on and a budget alert;
  - its Gemini key in Vercel as `GEMINI_SONGS_API_KEY`;
  - a Claude API key in Vercel as `ANTHROPIC_API_KEY`, with a monthly spend limit in the Claude Console.

- [ ] CSP and privacy page updated; a test reads `vercel.json` and checks the CSP carries exactly the new hosts.
- [ ] `src/subjects/arabic/song/`: link parser, LRC parser, `MM:SS.s` parser and order check, timing, word marking. All pure and unit-tested.
- [ ] `api/song.ts`:
  - `lookup`: LRCLIB;
  - `listen`: Gemini with the YouTube link and LRCLIB's hint, with model fallback;
  - `settle`: Claude compares two listens (songs without lyrics);
  - `explain`: Claude, with Gemini text and Groq as backups;
  - `fix`: a player's word fix, saved with history;
  - the limits claimed in Supabase.
- [ ] Migration:
  - `songs`: shared, read by signed-in players, written only through `security definer` functions the server calls;
  - `songbook` and `songbook_lines`: own rows, RLS;
  - `claim_song()`: 5 a day per player, and 7 hours of video a day game-wide.
- [ ] The corner:
  - paste;
  - the *listening* state, with automatic retry;
  - the player (IFrame API, no overlay);
  - the lines and word taps;
  - the nudge and the songbook.
- [ ] *Keep this line*, the review card (`song:` items), the events and the contract.
- [ ] Docs: `ARCHITECTURE.md`, `RUNNING.md` (the limits, and how to see songs stuck in *listening*), the privacy page and the guidebook page.

## Out of scope (kept, not dropped)

- Word-level timing heard from the audio (lines are timed; words are estimated within a line).
- Singing back and being scored on it (that's the voice work of #342).
- Songs in the Morse track. A Morse "song" is the rhythm itself, and that's the Radio Room.
