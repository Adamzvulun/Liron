# The Radio Room: on the air (E16)

- **Status:** design and first build, written 2026-11-10 night while Adam slept (he said to make the calls he'd make). Every "my call" below is easy to change.
- **Epic:** E16 Radio QSO in the [roadmap](../process/ROADMAP.md) (M4).
- **Inputs:**
  - [ADR 0007](../decisions/0007-partners-are-simulated-people.md): partners are characters, the channel is realistic, and you're only heard as you keyed.
  - The operator drafts in [discovery 03](../discovery/03-game-layer-and-partners.md) and [04](../discovery/04-world-and-lore.md).
  - The Far Station trial ([ranks §2](ranks-and-achievements.md)).
  - The Codebook's Q-codes and prosigns ([Morse words](morse-words.md)).

## 1. What it is
After the Far Station (the Operator's trial), the Radio Room is a place to come back to. Each day a few operators are calling CQ, and you pick one to work. Every contact goes in your logbook, and the operators remember you.

**AI for the news only (E15, [ADR 0036](../decisions/0036-ai-partner-first-slice.md), 2026-11-10).** ADR 0007 pairs a scripted QSO engine with a free model that adds personality. Each operator's personality lives in their script (their own lines, fist and band), and since E15 the last part of a ragchewer's chat turn, their news, is written live by `gemini-3.5-flash-lite` (Groq as the backup), through `api/partner.ts`. What you copy for the log stays scripted. Operators remember their last 3 news lines with you (`radio.notes`). The news shows in the logbook result. The room says openly that the news is written by an AI. When the AI isn't set up, is slow, over the cap (40 a day) or breaks a rule, the script's line is sent.

**You tell your news too ([ADR 0037](../decisions/0037-ai-partner-answers-your-news.md), 2026-11-10).** After their chat you key a few words of your own (or skip), and they answer it live at the start of their sign-off (`FB ON UR NEW JOB, GL`), or with a plain `R R FB` when the answer is late. They remember the last 3 things you told them (`radio.told`) and may ask about them next time.

## 2. The cast
Six operators, all fictional, with made-up callsigns. They live in `content/morse/operators.json` (content is data):

| Operator | Who | Speed | Fist | Band | Opens |
|---|---|---|---|---|---|
| Nils, a fellow newcomer | Slow and friendly, sometimes sends a word twice | 12 wpm | Heavy dahs, uneven gaps | Clear | At once |
| Marta, a schoolteacher | Patient and chatty | 15 wpm | Clean | Light noise | At once |
| Captain Ivo, a retired ship's radio officer | Immaculate fist, sea stories | 18 wpm | Metronome | Some fading | At once |
| Kai, on a mountaintop | Portable, weak signal, battery running down | 16 wpm | Clean | Heavy fading and noise | After 3 contacts |
| Ruth, a night owl on 40 m | Talks about the weather and her cat | 20 wpm | Light swing | Another station nearby (QRM) | After 6 contacts |
| Dex, a contest operator | Fast and terse: "5NN TU" | 25 wpm | Clean, fast | Busy band | After 10 contacts |

- **Who's on the air:** three operators call each day, picked from those you've opened. The pick is the same all day, so coming back finds the same people.
- **They remember you.** An operator you've worked before greets you as an old friend ("GE AGN"), and the logbook counts your contacts with each.

## 3. A contact
It follows real conventions, one turn at a time, as in the Far Station:

1. **They call:** `CQ CQ DE <call> <call> K`. You copy their call.
2. **You answer with the key:** `<call> DE <your call> K`.
3. **Their report:** greeting, `UR RST`, name and QTH (their town), then `HW?` (how copy?). You copy the RST, name and town.
4. **Your report:** `R TU <name> UR RST 599 <BT> NAME <yours> <BT> QTH <yours> K`, with the key.
5. **Their chatter:** one line about their rig and one about their weather, in their own words. You copy one detail, the temperature.
6. **Your news (ADR 0037):** key a few words of your own, freely, or skip. Not scored.
7. **You sign:** `TU <name> 73 <SK>`.
8. **They sign:** their answer to your news, then `TU 73 <SK>`; for Dex just `TU`.

Dex keeps it short: no chatter or news turn, and `5NN` for the report (the contesters' 599).

**Your callsign and name (my call):** the first time you sit down, you get a callsign of your own and type your name on the air (letters only, at most eight). You keep both, and you can change the name later. A subject can't see your player profile (ADR 0019), so the room asks. The Far Station still makes a new call each time, because it's a trial.

## 4. The channel
- **QRS:** while you listen, even mid-send, you can ask them to slow down. They answer `QRS` and send the rest of the contact 5 wpm slower, down to 10 wpm. It isn't a failure, and real operators do it all the time.
- **AGN:** as in the Far Station, hear a turn again, once per turn.
- **Garbled keying:** the operator reads only what the decoder read. If it isn't right, they ask in their own words (`AGN?`, `PSE RPT`, `?`), and you send it once more. A turn they still can't read is logged as missed.
- **The band:** each operator's band adds three effects:
  - **noise:** filtered hiss under the tone;
  - **fading (QSB):** the signal swells and sinks slowly;
  - **interference (QRM):** another station keying faintly on a nearby pitch.
- **Their fist:** each operator keys with their own timing: dah weight, a swing between letters, and a little jitter. Dex and the Captain are machine-clean, and Nils isn't.
- The effects are Web Audio nodes behind the player's `route` hook. No new library is used.

## 5. The log and rewards
- **A contact is logged** when you copied every part and every keyed turn was read (after an AGN if needed), as in the Far Station.
- **XP:** 25 for a logged contact and 5 for a try (my call). The Far Station pays 60 once, because it's a trial.
- **The logbook** shows how many contacts you have, how many with each operator, and the last few calls worked. It keeps the last 100 contacts.
- **Events** (migration `20261123000000_radio_room.sql`): `qso` for every try, `qso-logged` and `worked-<operator>` for a logged contact, and `qso-clean-fast` once.
- **Contracts (my call):** "Log a contact in the Radio Room" (20 gold) and "Answer 2 calls in the Radio Room" (15 gold). Both are offered only once you've answered a call, so nobody gets them before the Far Station.
- **Achievements (my call):**
  - **Worked All:** log a contact with all six operators. 3 gems and the title "of the Airwaves".
  - **Full Logbook:** log 50 contacts. 3 gems.
- **Signal Master:** the rank asks for a QSO at 25 wpm with no repeats. Dex always sends that fast; other operators do once your own speed has lifted them there (12.4). The contact must be logged with no AGN, no QRS and no resend. It's kept in `radio.cleanFast`.
- **AI slices built:** the operators' news (ADR 0036), and their answer to the news you key, with memory of it (ADR 0037).

## 6. Where it lives
- **The hall:** the Radio Room plaque says "On the air · 3 calling" once the Far Station is passed. The Far Station stays in the room as the trial.
- **Code:**
  - `src/subjects/morse/qso/onAir.ts`: the cast, the day's pick, the contact's turns, the result and the log.
  - `band.ts`: the noise, fading and interference, and the fist.
  - `RadioRoom.tsx`: the screen. The turns are shared with the Far Station.
- **Saved:** `radio` in the Morse progress holds your callsign and the log.
