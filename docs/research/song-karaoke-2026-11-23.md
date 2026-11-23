# Songs from YouTube: research (2026-11-23)

Adam's ask: "a feature that allows a user to paste a youtube link and get a full transcribed, translated and transliterated karaoke style walkthrough of the song that'll allow him to learn the words through music."

Planning only. Spec: [song-karaoke.md](../game/song-karaoke.md). Decision: [ADR 0059](../decisions/0059-songs-from-youtube.md) (Accepted).

> **Part 1 (§1–7) is the first pass.** It concluded that the words must be found or pasted. Adam rejected that: the player pastes the link and nothing else, and "it is possible, I did it before". **Part 2** is the answer: Gemini listens to the YouTube link, tested on real songs. Where Part 2 and Part 1 disagree, Part 2 holds.

## 1. What YouTube allows

| Question | Finding | Source |
|---|---|---|
| Can we pull a video's audio and transcribe it? | **No.** The developer policies prohibit offering users a way "to download or separate audio tracks", and offline downloads outside YouTube Premium. Google gives an mp3-from-video service as an example. | [Developer policies guide](https://developers.google.com/youtube/terms/developer-policies-guide), [Developer policies](https://developers.google.com/youtube/terms/developer-policies) |
| Can we read a video's captions? | **Not for other people's videos.** `captions.download` requires permission to edit the video. | [captions.download](https://developers.google.com/youtube/v3/docs/captions/download) |
| Can we play the video in our page? | **Yes**, with the IFrame Player API. Rules: no overlays or other elements over any part of the player, its controls included; the player at least 200 × 200 px; no nested iframe chains; and the page must send a Referer (ours sends `strict-origin-when-cross-origin`, which is enough). The API also gives `getCurrentTime()`, `seekTo()` and `getDuration()`, which is everything karaoke needs. | [Required minimum functionality](https://developers.google.com/youtube/terms/required-minimum-functionality), [Player parameters](https://developers.google.com/youtube/player_parameters), [IFrame API reference](https://developers.google.com/youtube/iframe_api_reference) |
| Can we get the title without a key? | **Yes.** `https://www.youtube.com/oembed?url=…&format=json` returned 200 with JSON in a test today. It gives the title and channel name, with no API key. | tested 2026-11-23 |

**What follows.** We play the song through YouTube's own player, and the words come from somewhere else. "Transcribed" therefore means *found*, not *heard*.

## 2. Where the words come from: LRCLIB

[LRCLIB](https://lrclib.net) is a free, open lyrics database. Read from its own docs ([docs.txt](https://lrclib.net/docs.txt), [llms.txt](https://lrclib.net/llms.txt)) today:

- **Access.**
  - No API key.
  - CORS is open (`Access-Control-Allow-Origin: *`).
  - Clients should name themselves in `User-Agent`; from a browser, in `X-User-Agent` or `Lrclib-Client`.
- **Endpoints.**
  - `GET /api/search?q=…` searches by free text.
  - `GET /api/get?track_name=…&artist_name=…&duration=…` finds the best match for a known track. Duration is in seconds.
  - `GET /api/get/{id}` fetches one record.
- **What a record holds.**
  - `plainLyrics`.
  - `syncedLyrics`: LRC, with one timestamp per line.
  - `hasWordSync`: true when its Lyricsfile has word timings.
- **Rate limits.**
  - About 45 requests a minute per IP for an unnamed client, and 90 for a named one.
  - On 429, honor `Retry-After`.
  - Free optional registration raises the limits.
- **License.** None stated for the lyrics text. It's crowd-sourced, and has a "flag" endpoint that names copyright violations as a reason. **We treat the lyrics as someone else's copyrighted text** (§5).

**Arabic coverage, tested today** (`/api/search`, first 20 results each):

| Search | Synced | Plain | Word-synced |
|---|---|---|---|
| فيروز | 14 | 19 | 0 |
| Fairuz | 10 | 19 | 0 |
| Mohammed Assaf | 12 | 20 | 2 |
| محمد عساف | 6 of 6 | 6 | 1 |
| Elyanna | 19 | 20 | 1 |
| Saint Levant | 19 | 20 | 3 |
| 47Soul | 17 | 20 | 2 |
| Nancy Ajram | 17 | 20 | 1 |
| عمرو دياب | 15 | 19 | 0 |
| Wegz | 19 | 20 | 4 |
| Marwan Pablo | 20 | 20 | 0 |

- **Coverage.** Almost every result is in Arabic script, and most are line-synced. Word-level sync is rare, so the karaoke works per line, and moves within a line by estimate (spec, requirement 6).
- **Names follow YouTube titles.** Many track names are YouTube titles ("Elyanna - Fenee (Official Visualizer)"), so the video's title is a good search key.
- **Duplicates.** Several records can exist for one song, with different timings for different versions (the album cut, the video with an intro). Duration matching and a timing nudge handle that (§6).

## 3. Translation and Latin

- **Who does it.** The AI partner (`api/partner.ts`) already writes Arabic in our Latin scheme for the inn.
- **What it's asked, per line:**
  - the meaning in English;
  - the line in the deck's Latin;
  - a gloss for each word;
  - the dialect (Levantine, Egyptian, Gulf, Iraqi, Maghrebi, MSA).
- **Hebrew letters** are made from the Latin with `latinToHebrew`, as everywhere else.

**The budget, read from [Groq's rate-limit page](https://console.groq.com/docs/rate-limits) today:**

| Model | Requests a minute | Requests a day | Tokens a minute | Tokens a day |
|---|---|---|---|---|
| `openai/gpt-oss-120b` (the inn's model) | 30 | 1K | 8K | 200K |
| `whisper-large-v3` | 20 | 2K | 7,200 audio-seconds an hour | |

- **What a song costs.** About 40 lines, so about 1.5K tokens in. The answer, with the model's reasoning, is about 6–10K tokens. That's about **10K tokens a song**.
- **What that leaves.** 200K a day is about **20 songs a day for the whole game**, shared with the inn's chats.
- **What follows:**
  - the work runs in batches of about 10 lines, to stay under 8K a minute;
  - there's a per-player daily limit;
  - a song once explained is saved, so it isn't paid for twice (§5, question 2).

## 4. Hearing a song ourselves (Whisper)

- **What's allowed.** Whisper is allowed for audio the *player* owns (ADR 0014 already uses Groq Whisper).
- **What it gives.** Word and segment timestamps (`verbose_json`), with a 25 MB file limit on the free tier ([Groq speech-to-text](https://console.groq.com/docs/speech-to-text)).
- **What isn't known.** How well it hears sung Arabic over music. We haven't tested it, and singing, reverb and instruments are hard for speech models. It's not part of the first build. It's a parked item with its own test: three songs Adam owns, scored line by line against their real lyrics. That's not a cut; it's ordered later.

## 5. Copyright and data

- **The lyrics are third-party text.** They're shown to one player, in their own session, next to YouTube's own player, for study.
- **They never go into `content/`, git, tests or the shared cache.** Tests use made-up lines.
- **What's saved.** A player's *songbook* row keeps:
  - the video id;
  - the LRCLIB id;
  - the timing nudge;
  - the AI's per-line notes;
  - the lines they kept for review.

  The lyrics themselves are fetched fresh from LRCLIB each time.
- **Data sharing.** The lyrics are sent to the AI (Groq) to be explained, and nothing the player typed goes with them. Whether Gemini may also take them is Adam's call (question 1).

## 6. Pre-mortem (the-fool, "find the failure modes")

*It's three months later and the feature failed. Why?*

| # | Failure story | Likelihood | Mitigation in the plan |
|---|---|---|---|
| 1 | **The words don't match the video.** The video has a 20-second intro, but the lyrics are timed for the album cut, so every line lights up early and the karaoke feels broken. | High | Search by the video's own duration, ±3 s. A **timing nudge** (−/+ 0.5 s, and "this line is now" to set it in one tap), saved per song. Up to 3 candidates are shown when the match is unsure. |
| 2 | **The budget runs out.** Two friends each open five songs, and the inn stops answering for the day. | High | A per-player limit of 2 new songs a day, and a game-wide cap that keeps half the day's tokens for the inn. Songs once explained are saved. |
| 3 | **The dialect is wrong for the course.** Most hits are Egyptian or Gulf, and Adam learns words he can't use with Palestinians. | Medium | Every song is tagged with its dialect. Non-Levantine words are marked "not ours" and are never added to reviews automatically. A short list of Levantine starting songs is offered (by title only, never with lyrics). |
| 4 | **The Latin is wrong.** The AI writes Latin that disagrees with the deck's scheme, and the player learns bad forms. | Medium | The prompt carries the scheme's rules and examples. Words found in the deck use the **deck's** spelling, not the AI's. A unit test of the Latin check runs on made-up lines. |
| 5 | **YouTube says no.** A video can't be embedded (the owner turned it off), or the page breaks a player rule. | Medium | We read the player's `onError` 101/150 and say "This video can't play outside YouTube", with a link to it on YouTube. There's never an overlay on the player, and its size is checked at 360 px wide in the browser test. |
| 6 | **It's a toy, not learning.** It's fun once and teaches nothing. | Medium | **Keep this line** turns a line into a review card: hear the line from the video (`seekTo` + play, within the player) and fill in the missing word. The `song-line` events and a daily contract tie it to the economy. The known words are lit, so a song shows your progress. |
| 7 | **The service vanishes.** LRCLIB is down or rate-limits us. | Low | Honor `Retry-After`. Fall back to **paste the lyrics** (with tap-to-time). A saved song keeps working if LRCLIB has it again. |

**The inversion check.** For it to fail for sure, we'd need to extract YouTube's audio, put lyrics in git, and send everything to the AI with no limit. The plan does none of these.

## 7. Questions for Adam (answered 2026-11-23; see Part 2)

1. **The AI for lyrics.** Groq only, as at the inn (recommended: same rules, one vendor)? Or may Gemini take song lyrics too? Lyrics are public text, not the player's own words, and Gemini would add budget. Gemini's free tier may use what it's sent to improve Google's products.
2. **Sharing explained songs between friends.** If a friend opens a song already explained, should they reuse the explanation (saves budget)? That keeps AI notes about a copyrighted song in a table every player can read. Recommended: **no**, each player's own row only, at least until friends actually hit the limit.
3. **The YouTube terms.** We play through YouTube's player and never take its audio, so the words come from LRCLIB or are pasted. Is that acceptable as "transcribed"?
4. **Where it goes in the order.** Planned as Phase 15, after Phase 14. It could move before Phase 11 if songs matter more than sentence listening to you.

---

# Part 2 — Paste the link, that's all (2026-11-23, after Adam's answers)

Adam's answers to §7:
1. "Figure out what's best."
2. Yes, share explained songs.
3. "Not even close… find a way to do it without the user having to do anything but paste the link."
4. After Phase 14.

## A. Gemini listens to the YouTube link

- **The feature.** The Gemini API takes a public YouTube URL as a video part (`file_data.file_uri`). Google fetches and listens to it on its own side.
- **What the docs say** ([video understanding](https://ai.google.dev/gemini-api/docs/video-understanding), read today):
  - it's in preview, "available at no charge", and "pricing and rate limits are likely to change";
  - the free tier allows up to 8 hours of YouTube video a day;
  - public videos only.
- **Why it's allowed.** It's Google's own documented feature, not a download by us, so YouTube's rule against separating audio (Part 1, §1) isn't touched.

**Tested today with our own key** (it's in this environment as `GEMINI_API_KEY`):

| Test | Result |
|---|---|
| Google's own example video | Works. |
| 10 Arabic videos from search: Fairuz lyric videos, covers, a folk group, children's songs, a lesson | 9 worked and named the first line correctly. 1 got 503. |
| Fairuz, *Habaytak bel sayf* (a fan upload), `gemini-3.5-flash-lite`, no hint | 6.4 s, about 21K tokens for 5½ minutes at low resolution. 33 lines, about 4 in 5 exact. The rest were near-sounding mistakes: هالبنت for هاك البنت, وتتبل for وتدبل, الغريزة for الغريبة, ولا أنا for ملقانا. |
| The same song, `gemini-3.6-flash`, **with LRCLIB's plain lyrics as a hint** | 40 lines, near word-perfect. All four mistakes above were right. The three-line chorus was split as sung. The dialect was named as Levantine. |
| Times | Asked "in seconds", Gemini wrote 1:07 as `107` and 3:01 as `301`. Asked for `MM:SS.s` text, all 40 lines came back clean and in order, and agree with the first run within about 0.5 s. **Not yet checked by ear against the audio.** That's the first check in 15.3, and the nudge (spec §9) covers small offsets. |
| `gemini-3.5-transcribe` | Refuses video input. |
| `gemini-2.5-flash` | "No longer available to new users"; Google renames models often, so the model list is a setting. |

## B. The other ways, and why not

- **A download tool (yt-dlp) plus Whisper.** This is the usual "I did it before" way, and it works on a home computer. From a server, YouTube blocks cloud addresses ("Sign in to confirm you're not a bot"); the known fixes are rotating residential proxies, which cost money, and PO-token plugins, which break often ([yt-dlp PO Token Guide](https://github.com/yt-dlp/yt-dlp/wiki/PO-Token-Guide), [a developer's write-up](https://dev.to/osovsky/i-was-building-a-cloud-video-service-youtube-turned-me-into-an-ip-trafficker-1l9o)). It also separates the audio, which YouTube's policies forbid.
- **YouTube's own auto-captions,** read by scraping (youtube-transcript-api). Blocked from cloud addresses in the same way ([issue 593](https://github.com/jdepoix/youtube-transcript-api/issues/593)). Music videos often have no auto-captions anyway.
- **The browser capturing the tab's sound.** It needs the player to share the tab, every time. That's more than pasting.
- **LRCLIB alone.** Gaps, and some Arabic records are poor. The *Habaytak bel sayf* record had 4 lines for a 40-line song, spelled by ear (الشيتي). It's good as a hint, not as the answer.

## C. The catch: the free tier is often busy

Gemini answers 503 "high demand" often, and more often for long requests than short ones:

- **Long requests.** The transcription with a hint failed 5 times in a row on `gemini-3.5-flash-lite`, then 6 times. On a later run it took 2 tries.
- **A probe.** Once a minute for about 15 minutes, a short question about the same video went to each of five models (results in §D).
- **What the design does about it** (spec, "While the singer is busy"):
  - it falls back across models;
  - it saves the song as *listening* and retries by itself;
  - the shared songbook means each song only needs to succeed once, for everyone.
- **If Google's preview becomes paid,** that comes to Adam as a question. LRCLIB-only keeps the corner working meanwhile.

## D. How often it answers (probe, 19:23–19:49 UTC)

The same short question about the Fairuz video went to five models, once a round, for 15 rounds:

| Model | Answered | Busy (503) | Rate-limited (429) | Timed out |
|---|---|---|---|---|
| `gemini-3.5-flash-lite` | 13 | 2 | 0 | 0 |
| `gemini-flash-lite-latest` | 12 | 3 | 0 | 0 |
| `gemini-3.6-flash` | 9 | 1 | 3 | 2 |
| `gemini-3.8-flash` | 0 | 11 | 3 | 1 |
| `gemini-flash-latest` | 0 | 10 | 5 | 0 |

- **What the probe shows.** In **all 15 rounds, at least one model answered**, so the fallback order works: `gemini-3.6-flash` first for accuracy, then the two flash-lite models.
- **The 429s.** They came late in the probe, when our own key had sent about 75 video requests in 26 minutes. That's far beyond what friends will send, since each song is heard once.
- **Long transcriptions.** They were busy more often than the short probe (§C), so automatic retries stay in the design.

## E. The pre-mortem, again (the-fool)

| # | Failure story | Mitigation |
|---|---|---|
| 1 | It's busy all evening, and Adam's song never arrives. | Model fallback, automatic retries and the shared songbook. LRCLIB's synced lines are shown meanwhile when their length matches. RUNNING.md says how to see songs stuck in *listening*. |
| 2 | Google ends the free preview. | The model and the feature are settings. LRCLIB-only is the stand-in. Paying is Adam's call, asked when it happens, not before. |
| 3 | The times drift from the audio. | A check by ear on three songs before 15.4 ships; the order and length checks; the nudge. |
| 4 | It mishears words. | The LRCLIB hint (tested: it fixed every mishearing in the test song); *heard by ear* marks songs without a hint. |
| 5 | Friends' songs fill the database with lyrics. | Lyrics live in one `songs` table, private to signed-in players, never in git. One row per video, so about 3 KB a song: 1,000 songs is about 3 MB of the 500 MB. |
