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
| `arabic/questline.json` | "The Long Road In", chapter I: the story, one milestone beat per script lesson, and the Painted Sign trial (#43) |

Copyrighted packs are built from `sources/` by `scripts/content/` and uploaded to Supabase, never written here.
