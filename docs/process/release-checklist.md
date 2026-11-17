# Release checklist, v1.0.0 (task 1.12, #320)

A walk of about an hour on the **dev site** (https://waymark-git-dev-adamzvuluns-projects.vercel.app), before the release PR goes into `main`. Tick each line, or write what went wrong under it. Claude fixes what you find, with tests, before the release.

Do the walk on your **iPhone in Safari** first. Then repeat the lines marked 🖥 on a **desktop** browser.

## 1. A new player (15 minutes)

To start as a new player, use a second account, or ask Claude to reset yours on `waymark-dev`.

- [ ] 🖥 **Sign in.** Good: the gate at dusk behind the form, no blue anywhere, and "Opening the gates…" for at most a moment.
- [ ] **The first page.** Good: it tells you what Waymark is and where to begin, and closing it leaves you on the square.
- [ ] **Follow the compass for ten minutes without help.** Do only what the line at the top says. Good: you always know what to tap next, and the line changes after each step.
- [ ] **On the phone, the compass line.** Good: it shows whole words over at most two lines, never cut mid-word.
- [ ] 🖥 **Back to the square from a hall.** Good: it feels instant, and the square shows the step you just did.

## 2. Sound and the microphone (8 minutes)

- [ ] **Sound with the silent switch off.** Play a Morse character and an Arabic word. Good: both sound, clean and at a normal volume.
- [ ] **Sound with the silent switch on.** Good: whatever happens, it is the same every time, and nothing else on the page breaks. (Write down what you hear.)
- [ ] **The microphone prompt.** Open "Say it" for the first time. Good: Safari asks once, and saying no leaves a clear way to go on without speaking.
- [ ] **"Say it".** Say a word you know. Good: it is understood, or the reply says plainly what was heard.

## 3. The Signal Tower (8 minutes)

- [ ] **One Koch lesson** (Lessons). Good: you can finish it, the sound and the answers keep pace, and the end shows what you earned.
- [ ] **Keying with the tap pad** (Sending, #9). Hold and release. Good: the tone starts the moment your finger lands, with no lag you can feel.
- [ ] **A Radio Room contact.** Open Settings first and read the Services line. If the radio is on, make one contact. Good: the other station answers in Morse and the contact ends with a log entry. If it is off, the Radio Room says so plainly.

## 4. The Caravanserai (8 minutes)

- [ ] **One script lesson** (#38, #39). Good: the letters are drawn clearly, and writing on the slate is judged fairly.
- [ ] **One word session.** Good: the words, their sound and their meanings match, and wrong answers come back later.
- [ ] **The coffee corner.** Good: the regulars greet you and the phrases play.
- [ ] **Sit and talk.** If Settings shows the partner as on, have a short exchange. Good: it answers within a few seconds, in Arabic you can follow.

## 5. The city (5 minutes)

- [ ] 🖥 **Buy something** in the Market. Good: the gold goes down by the price and the item shows as yours.
- [ ] **Open a chest** on the Notice Board. Good: you see what was inside, and it lands in your purse or wardrobe.
- [ ] 🖥 **Change your avatar** in Your House. Good: the square shows the new look straight away, and after a reload too.
- [ ] 🖥 **Sign out and in again.** Good: you land on the gate, and signing back in brings back your progress.

## 6. What 1.0.0 gained since this list was first written (15 minutes)

1.0.0 now carries everything on `dev` ([ADR 0049](../decisions/0049-one-zero-ships-what-dev-holds.md)), so the walk covers it too.

- [ ] **The ledger** in Your House. Good: the numbers look true for what you've done, and nothing reads blank or "NaN".
- [ ] 🖥 **Sound.** Tap around the square, then switch both sounds off in Settings and reload. Good: the sounds are small and fitting, and off stays off.
- [ ] **One ending.** Make a second account on `waymark-dev` the way [FRIENDS.md](FRIENDS.md) says (never use your own). Get its SQL: ask Claude for it with that account's email, or run `node scripts/endings.ts <its email> > endings.sql` yourself (Node 22.18 or newer). Paste it into the **dev** project's SQL editor and run it. Sign in with it. Good: the compass points at Forty Winters or the Stranger at the Gate, the finale plays to its end, and afterwards the compass still names something to do.
- [ ] *Optional, needs a friend's account:* **The Fellowship.** Make a second account ([FRIENDS.md](FRIENDS.md)), link the two by code, and visit each other's house. Good: each sees the other, and nothing private. Skip this and the friend features simply stay hidden on the live site until you invite someone.

## 7. Last line

- [ ] **Anything that annoyed you, and any moment you didn't know what to do.** Write them here, however small:

&nbsp;

## After the release (Claude's lines, for Adam to run)

- [ ] In Supabase, **`waymark-prod` → Realtime → Settings: switch "Allow public access" off** (RUNNING.md, Friends). Do the same on `waymark-dev` if you haven't. Free; it keeps the wire private.
- [ ] Run **Keep alive** by hand once: GitHub → Actions → Keep alive → Run workflow, on `main`. Good: both jobs green within a minute (task 1.9, #317).
- [ ] Sign in on the live site with your fresh account. Good: level 1, the first page, and the compass.
