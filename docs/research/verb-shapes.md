# Verb shapes: which Arabic forms match a binyan (#489)

For the pattern badges promised in [ADR 0002](../decisions/0002-arabic-variety.md) and [arabic-core-words.md](../game/arabic-core-words.md) §7. Written 2026-11-23.

## The question

Which Arabic verb forms (I–X) truly match a Hebrew binyan, so that a badge saying "shaped like piʿel" helps a Hebrew speaker and doesn't mislead them?

## What the sources say

- **Shared stems.** Wikipedia's *Proto-Semitic language* (§ verbs, citing Moscati et al. 1980, pp. 122–130, and Lipiński 1997, pp. 378–406) lists the derived stems the family shares: "stems with a geminated middle consonant", "causative stems", stems with the prefix *na-/*ni-*, and "stems with the suffix *-tV-*". Hebrew and Arabic both inherit these.
- **Piʿel and hitpaʿel ↔ forms II and V.** Wikipedia's *Semitic root* (§ quadriliteral roots): "in Hebrew, the Piʿel, Puʿal, and Hiṯpaʿel, and in Arabic, forms similar to the stem II and stem V forms".
- **Meanings line up.** *Arabic verbs*: form II is "causative and intensive", V is "usually reflexive of Form II", VII is the "anticausative" of form I, IV is "usually transitive and causative of form I". *Modern Hebrew verbs*: piʿel intensive, hitpaʿel reflexive, nifʿal passive or reflexive, hifʿil causative.
- **Not found in these sources:** a sentence pairing form IV with hifʿil, or VII with nifʿal, by name. The pairs rest on the shared stems above (a causative prefix, an *n-* prefix) and on matching meanings. The badge says "shaped like", not "the same as".

## The pairs we use

| Arabic (Levantine) | Shape | Binyan | Example on the badge |
|---|---|---|---|
| Form II: ráttab | doubled middle letter | piʿel | דִּבֵּר |
| Form V: it3állam | it- + doubled middle | hitpaʿel | הִתְלַבֵּשׁ |
| Form VII: inwálad | in- before the root | nifʿal | נִכְנַס |
| Form IV: á3ʈa | a- before the root | hifʿil | הִזְמִין |

**Left out:**
- Form VIII (ištáɣal, ixtār), with a t after the first letter. Hebrew has this only as a sound rule inside hitpaʿel (הִשְׁתַּמֵּשׁ), not as a binyan of its own.
- Form X (istá3mal), which has no binyan.
- Form III (sāfar), which has no living binyan.

The grammar card for chapter 20 ("Verb shapes: your binyanim") already teaches the first three.

## How the verbs were chosen

- **Sorting.** A script in the scratchpad took the 691 taught words glossed "to …" and sorted them by the deck's romanized past form.
- **Hand checks.** Every match was then checked by hand:
  - `intáʐar`, `intáxab`, `intáqad` and `intáha` start with an n in their root, so they are form VIII, not VII.
  - `ištára` and `ištáɣal` are VIII.
  - `iʈʈálla3` and `iʈʈállag` are V.
  - `árgal` has four root letters, so it isn't IV.
- **Result.** 124 verbs: 78 piʿel, 33 hitpaʿel, 6 nifʿal and 7 hifʿil.
- **Where they're stored.** The list is in `content/arabic/verb-shapes.json`, as deck ids only (ADR 0011).
