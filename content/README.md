# content/

Learning content as **data**, not code (CLAUDE.md): Morse characters, Arabic letters, words, phrases, lessons.

- One folder per subject: `content/morse/`, `content/arabic/`.
- Only content we may publish goes here. Copyrighted material (the Lingualism deck and book) stays in `sources/` and later in Supabase behind login. It never goes into the site bundle (ADR 0011).

## Format
Each file is a **content pack** ([ADR 0023](../docs/decisions/0023-content-format-and-private-pipeline.md), schema in [`src/core/content/schema.ts`](../src/core/content/schema.ts)): `subject`, `source`, `license`, `items` (each with a stable `id`, a `type`, the subject's own `data`, optional `media` and `tags`) and `lessons` (an `order` and a list of item ids). Every file here is checked on each test run.

| File | What |
|---|---|
| `morse/characters.json` | 41 characters in LCWO Koch order with ITU codes; 40 Koch lessons |
| `arabic/letters.json` | The 28 letters plus ة ء ى لا: names, alphabet position, whether they connect forward, the Hebrew bridge, sound, shape family and lesson; the 8 script lessons ([design](../docs/game/arabic-script-lessons.md)) |
| `arabic/marks.json` | The vowel marks (harakat): fatha, kasra, damma, sukun, shadda and tanween, each with its Hebrew niqqud twin, the lesson that teaches it, and a note on how the deck and Palestinian speech use it (#40) |
| `arabic/questline.json` | "The Long Road In": chapter 1 (the story, one milestone beat per script lesson, and the Painted Sign trial, #43), then chapters 2–88: the regulars at the innkeeper’s table, one per word chapter, each with 3 beats and a trial (#161) |
| `arabic/phrases.json` | The coffee corner's phrase sets (#45, #85): each set names deck rows by id, with our own gloss where the deck's English needs context (#125). The phrases themselves are the Lingualism deck's and stay private (ADR 0011) |
| `arabic/lesson-words.json` | The reviewed words of script lessons 1–3 (#125): the deck ids each lesson uses, with our own glosses, and the ids left out with the reason (verbs, unsuitable, unreadable homographs). Only ids and our words: no deck text |
| `arabic/core-words.json` | The word path (#159, #163): 2,610 words in 87 topic chapters of 30, each deck id with our own gloss, and the id of a deck sentence that uses it where one does (228 of 2,610; the rest have one of our own in `own-sentences.json`). Only ids and our words: no deck text |
| `arabic/grammar.json` | Grammar cards (#162): each rule in our own words, the chapter it comes before, and the ids of deck sentences that show it. Only our text and ids, plus the sun letters themselves |
| `morse/questline.json` | "The Silent Beacon", chapters 1–5: each chapter’s story and trial, and one lamp beat per Koch character (all 41) |
| `morse/words.json` | E12's word lists (#153): 170 common English words in frequency order, 16 Q-codes and 38 operator abbreviations with their meanings, and the 4 prosigns with their ITU codes ([design](../docs/game/morse-words.md)) |
| `morse/ranks.json`, `arabic/ranks.json` | The guild ranks (ADR 0035, #174): each rank's name (and Arabic name), its conditions in our words and its place on the ladder. A rank whose condition needs a feature not built yet says so in `later` and can't be taken. The subject's code checks the conditions; a schema test keeps each rank's `rank-<id>` event registered |
| `core/items.json` | The item catalogue (ADR 0033, #48): each earnable item's kind, slot, rarity, price and the milestone that gives it (the Market's wares and dyes, #49, have none). Copied into the database by a migration; a schema test keeps the two equal, and a unit test checks it against the avatar's gear |
| `core/chests.json` | The reward chests (ADR 0033, #48): each chest's drop table (gold range, chances of a gem, gear and a shield) and which chest each source gives. Copied into the database by a migration; a schema test keeps the two equal |
| `core/contracts.json`, `morse/contracts.json`, `arabic/contracts.json` | The daily contract templates (ADR 0032, #46): what each counts, its target, gold and text. Copied into the database by a migration; a schema test keeps the two equal |

Copyrighted packs are built from `sources/` by `scripts/content/` and uploaded to Supabase, never written here.
