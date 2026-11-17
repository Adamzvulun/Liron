# 0048 — The long evenings: a day worth opening after the road

- **Status:** Accepted (Claude, 2026-11-17, task 4.1, #333; built to [the-road.md](../game/the-road.md) §6, under Adam's instruction to decide as he would). Adam can overturn any of it on the dev site.
- **Date:** 2026-11-17
- **Builds on:** [ADR 0032](0032-subject-events-and-daily-contracts.md) (events and daily contracts), [ADR 0047](0047-the-two-finales.md) (the finales)

## Context

FSRS reviews thin out by design. A player who has finished a road would soon have almost nothing to do each day, and nothing said what happens then (PLAN gap 14). The Road doc already gives the rule: a finished road shows the compass's **meanwhile**, the same one a waiting road shows. That means reviews due, then a contract, then the station of the day, never the same two days running. Task 4.1 is to give that meanwhile something worthwhile to point at, with no new content sources, and mastery still can't be bought.

## Decision

1. **Master contracts, once a road's finale is passed.** Each road gets a harder tier of daily contracts, for 30 to 40 gold against the usual 15 to 20. They are data in each subject's `contracts.json` (`"tier": 1`) and in the migration `20270106000000_the_long_evenings.sql`. Each one requires the finale's own event (`requires_kind`, as the Codebook's contracts require a Codebook round), so they open the day after the pass.
   - **Morse:** 3 Koch runs at 90%; 5 recognition rounds; 2 whole Codebook rounds right; a callsign rush best beaten; a clean, fast contact in the Radio Room.
   - **Arabic:** 90% in 2 sessions at the innkeeper’s table; Sit and talk with two regulars; 10 shadowed sentences; 4 rounds at the echo well.
2. **For that road, the board offers them instead of the easy ones.** `pick_contracts` orders a road's templates by tier, highest first, and then by the day's seed. So once master contracts are open, the road's place on the board is always one of them, and which one changes by the day. The habit contract and the world events' contracts are unchanged. A finished player's board pays about 80 gold a day, against 45 before, for about twice the work.
3. **Personal bests in the evening's lines.** When the station of the day has a best to beat, the compass names it. Examples: "Tonight: Instant Recognition. Your best is 31: beat it." "Tonight: the brass key. Your fastest drill is 33 wpm: beat it." "Tonight: the Codebook. Your best round is 12 words: beat it." In the Caravanserai, after the finale: "Tonight: the table is never empty. Sit and talk with a regular." The words line counts the words you keep. Nothing is bought, and every line points at practice.
4. **The finale's chapter stays on the courtyard's scroll.** Once the gate is open, the scroll shows chapter 115, with the stranger's intro and, after the pass, the epilogue. A finished player never reads "the end" with nowhere to go: the compass line under it always names tonight's station.
5. **A prepared account for checking the endings.** `scripts/endings.ts` prints SQL that sets one account's progress one step before each finale, for the dev project's SQL editor only (VERSIONS.md, 3.0). It connects to nothing and needs no key. `tests/endings.test.ts` proves both compasses point at their finales.

## Consequences

- The 30-day rotation test from task 1.3 now runs on a finished road with bests to chase, in both subjects.
- More master contracts are a content change plus one migration row, as with every contract.
- If gold piles up for finished players, retune the master tier's gold. It doesn't change what can be bought, because mastery is never for sale.
