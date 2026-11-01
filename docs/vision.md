# Vision

- **Status:** Living doc. This is the north star; when it changes, record why in an ADR.
- **Last updated:** 2026-11-01

## In one line
**A cute, game-like hub (a lobby) where Adam learns the things he wants to learn. Each subject is its own self-contained world with Duolingo-style progression. Friends can join, compete, and learn together.**

## The shape
- **The lobby is the product.** It's an illustrated, game-like hub, with the warmth and chunkiness of a classic browser-RPG town screen. *Swords and Sandals 3 is the mood reference: we borrow the feeling, not the assets or layout.* You have a character, a level, and rewards. Each subject is a **place** you enter.
- **Subjects are independent.** Arabic and Morse share no content and no cross-over mechanics. They share only the *platform*: profile, XP, streaks, progression, social, and the lobby itself.
- **Room to grow.** There are empty plots in the lobby for subjects to be added later. Adding a subject means building a new place, not redesigning the hub.
- **Progression like Duolingo:** small daily lessons, a visible path, streaks. But every lesson teaches something that *actually matters*.
- **Social later, designed for from the start:** friends, leaderboards, shared progress, head-to-head challenges.
- **Creatively stunning.** Art direction is a first-class workstream, not polish at the end. Bold cartoon arena-town style (ADR 0006), with a customizable avatar.
- **Partners are people.** The AI you practice with simulates a real person on the other end, never a tutor (ADR 0007).
- **Rewards are cosmetic and functional** (gear, pets, streak freezes, hints), but mastery can't be bought.

## Learner goals (Adam)
| Subject | Goal | Daily time |
|---|---|---|
| **Arabic** | Understand and speak the Arabic spoken around him in Israel. Basic speech, reading, and writing, enough to hold a conversation. | 15–20 min total, sometimes more |
| **Morse** | Send and receive without thinking: instant recognition, head copy, fluent sending. Not licensed; the skill itself is the goal. | (shared with Arabic) |

## Constraints
- Works equally well on **phone and desktop**.
- Morse input is a **keyboard key** (desktop) or a **tap pad** (phone). No hardware paddle.
- The AI the user chats with must use a **free model**.
- Built fresh; nothing is reused from morsehub except the idea.
- "Liron" is a **placeholder name**.
- **Use existing sources; don't author source material.** We curate, sequence, and present. See `docs/research/arabic-sources.md`.
- No native-speaker helpers are available, so audio comes from existing recordings and dialect TTS.

## Non-goals (for now)
- Cross-subject mechanics.
- A Morse licensing curriculum.
- Formal written Arabic (MSA) as the main target. See ADR 0002.
