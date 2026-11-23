# Later: what stays open on purpose

Everything Waymark's docs promise but haven't built yet, in one place (task 5.2, #341). Per [CLAUDE.md](../../.claude/CLAUDE.md), this is **ordering, not cutting**: nothing here is dropped. Each item says why it waits and what would un-park it. When one un-parks, it becomes the next free version of the current chapter ([VERSIONS.md](VERSIONS.md)).

Checked against the code on 2026-11-17.

## Waiting on a decision of Adam's

| Item | Why it waits | What un-parks it |
|---|---|---|
| **The regulars speak aloud** (#342) | No free Arabic voice meets the rules so far. Adam ruled Azure out on 2026-11-02, and said on 2026-11-16 he'll look at it himself. | His answer on Azure. Then: a research note on what qualifies that day, sample lines from our own sentences, an ADR, and a play button on each regular's line, with a daily allowance, in the pattern of `api/partner.ts`. |
| **Pronunciation scoring** | No free service does it ([ADR 0013](../decisions/0013-speech-on-free-gemini.md)). Azure's does. Both finales say plainly that they can't judge it. | The same Azure answer. |
| **More Arabic word chapters** | The deck is used up at 3,390 words. Maknuune is CC BY-SA, so anything built from it must be shared alike. Adult and toilet words were skipped on purpose (Adam, 2026-11-15). | Adam's call on Maknuune or another source. |
| **Recordings for the phrases the deck lacks** | No free, licensed source could be verified ([research](../research/phrase-audio-sources.md)). | A verified source, or the voice above. |
| **The third guild hall** (task 4.5) | Parked by Adam on 2026-11-18: "third subject won't come soon". The subject is his choice. The guide is written: [ADDING-A-SUBJECT.md](ADDING-A-SUBJECT.md). | His pick. The build starts with that guide's "Known gaps". Don't start it before then. |
| **A domain and email invites** | A yearly cost. | Adam, if handing out passwords proves annoying ([ADR 0039](../decisions/0039-fellowship-answers.md)). |
| **Backups** | Adam chose the keep-alive only. | Adam. |
| **Pre-rendered scenery** (#137) | Prototyped on 2026-11-09. It made the slowed phone slower, and Adam's yes depended on it helping (HANDOFF, item 4). | Adam's report from his phone on how the square feels now. |

## Ordered after the roadmap, no decision needed

| Item | Where it was promised | Why it waits | What un-parks it |
|---|---|---|---|
| **More of the regulars' tales** (micro-stories made only of words you know) | [arabic-core-words.md](../game/arabic-core-words.md), the vision's Arabic track | Chapters 1–20 are built (#491). Each later batch is written and checked like the own sentences. | The next batch, ten regulars at a time. |
| **A root explorer** | [arabic-core-words.md](../game/arabic-core-words.md) §7 | Shared-root badges (311 words) and pattern badges (124 verbs, #489) came first. An explorer needs every taught word's root, which the deck doesn't give. | A root for each taught word, written and checked like the own sentences. |
| **A combo bonus inside activities** | [economy.md](../game/economy.md) | Planned since E6. The end-of-activity screens came first, and the contracts and chests now carry the daily rhythm. | Adam wanting it after playing v3.0. |
| **A weekly league** | [economy.md](../game/economy.md) | It needs friends on the live site (task 3.7), and Waymark is for a few friends, not strangers. | The Fellowship released, and Adam wanting competition beyond the Arena. |

## Not on this list

Things that were once "later" and are now built are ticked in [PLAN.md](PLAN.md) and their design docs. Examples: world events, the city's sounds, the Fellowship, both finales, the long evenings, and friends learning from the deck (v1.1.0, [ADR 0050](../decisions/0050-friends-learn-from-the-deck.md)).
