# Vision

- **Status:** 🔒 **Locked v1 (2026-11-01).** Living doc: changes need an ADR.
- **Name:** **Waymark**, a guidepost for travelers. It's the name of the hub and of the crossroads city.
- **Last updated:** 2026-11-01

## In one line
**Waymark: a stylized, MMO-like hub (a crossroads city of guilds) where Adam learns the things he wants to learn. Each subject is its own self-contained world with Duolingo-style progression. Friends can join, compete, and learn together.**

## The shape
- **The lobby is the product.** It's an illustrated, game-like hub, with the warmth and chunkiness of a classic browser-RPG town screen. *Swords and Sandals 3 is the mood reference: we borrow the feeling, not the assets or layout.* You have a character, a level, and rewards. Each subject is a **place** you enter.
- **Subjects are independent.** Arabic and Morse share no content and no cross-over mechanics. They share only the *platform*: profile, XP, streaks, progression, social, and the lobby itself.
- **Room to grow.** There are empty plots in the lobby for subjects to be added later. Adding a subject means building a new place, not redesigning the hub.
- **Progression like Duolingo:** small daily lessons, a visible path, streaks. But every lesson teaches something that *actually matters*.
- **Social later, designed for from the start, and friendly:** a fellowship of friends, co-op quests, opt-in challenges and personal bests. No demotion leagues.
- **Quests, not chores:** main questlines are the curriculum, daily contracts are the reviews, and trials are the checkpoints (discovery 04).
- **Private and invite-only** (ADR 0008).
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
- The product is named **Waymark**. The repo keeps the name `Liron`.
- **Use existing sources; don't author source material.** We curate, sequence, and present. See `docs/research/arabic-sources.md`.
- No native-speaker helpers are available, so audio comes from existing recordings and dialect TTS.

## Costs & commitments (everything that may cost money or has strings attached)
| Item | Cost | Strings attached | Status |
|---|---|---|---|
| **Paid Arabic decks** (e.g. Lingualism Palestinian vocabulary deck: ~4,800 cards with native audio; Adros Verse graded levels) | One-time purchase per deck. **Prices not yet checked.** | Copyrighted: personal use. Must not be stored in the public repo. | ⏸️ Not now. Start free; buy only if free content feels thin (0008) |
| **Free Arabic sources** (Elihay "Speaking Arabic" community deck with audio; Maknuune lexicon; Madrasa course as a structure reference) | Free | The Elihay deck is a free share of copyrighted material. Maknuune's license is unverified. | ✅ Starting point (0008) |
| **Gemini API** | Free tier | Google may use free-tier chats to improve its models; daily limits | Accepted (0004) |
| **Gemini paid tier** | Pay-per-use | — | Maybe later (0004) |
| **Supabase** | Free tier | Free projects are **paused after about a week of inactivity** (one click to resume); storage and DB size limits | Accepted (0005) |
| **Vercel** | Free (Hobby) tier | Hobby plan is for personal, non-commercial use, which fits | Accepted (0005) |
| **Domain name** (e.g. waymark.something) | ~$10–20/year, optional | — | Not decided |

## Non-goals (for now)
- Cross-subject mechanics.
- A Morse licensing curriculum.
- Formal written Arabic (MSA) as the main target. See ADR 0002.
