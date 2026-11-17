# 0049 — 1.0.0 ships what `dev` holds

- **Status:** Accepted (Claude, 2026-11-17, under Adam's instruction to decide as he would before 1.0.0 goes live). Adam can overturn it at any point before he merges the release PR: the other choice is written below.
- **Date:** 2026-11-17
- **Amends, once:** [ADR 0040](0040-versions-on-a-map.md) §5 (a release is cut from its version's last commit)

## Context

ADR 0040 says a release branch is cut from `dev` at the commit where its version's tasks were all in. For 1.0 that is `df38b89` (#348). The idea was that Adam could walk 1.0 slowly while 1.1 and later went on in `dev` without slipping in.

That isn't how it went. Adam hasn't walked 1.0 yet, and by now `dev` holds every version up to 3.0: the ledger, sound and events, friends, the Arena, the wire, both finales and the long evenings. Cutting at `df38b89` now would mean:

- **The checklist walks the wrong game.** Adam walks the dev site, which runs `dev`'s head, not `df38b89`. What he approves wouldn't be what ships.
- **Fixes are left behind.** Most of 1.0's own code changed after `df38b89`: the top bar, the city, both roads, chests, the player store and the auth screens (108 files in `src/`). Later work fixed things in it, for example the Notice Board's unreadable quiet line, found in the last sweep. Bringing those fixes across would mean picking them out one by one, from commits that mix them with new features.
- **Nothing is gained.** The reason for a cut, work going on in `dev` while Adam walks, no longer applies: everything Claude can build alone is built.

## Decision

1. **The 1.0.0 release PR goes from `dev`'s head**, through the branch `release/v1.0.0` cut from that commit, as ADR 0040 says, but at the head, not at `df38b89`.
2. **1.0.0's notes say everything it carries** ([releases/v1.0.0.md](../process/releases/v1.0.0.md)), grouped by place, as before.
3. **The release checklist grows by what's new** since the 1.0 checklist was written: the ledger, sound, both endings (through `scripts/endings.ts`), and friends with a second account. The friends' lines are optional: Adam can release with no friend invited, and the friend features then never show.
4. **The live site needs one more setting:** Realtime's "Allow public access" off for `waymark-prod`, as for dev (RUNNING.md, Friends). Without a friend it changes nothing a player sees, but it should be off before the wire is reachable.
5. **VERSIONS.md's 1.1 to 3.0 become part of 1.0.0.** Their tasks and finish lines stay as the record. The next release after 1.0.0 is 4.0, or a 1.Y for whatever Adam's first weeks on the live site turn up. Adam's gates for 2.x (what friends without the deck may learn, a first friend, trying the wire) move from "before releasing" to "before inviting a friend", because nothing in them is reachable without a friend.
6. **ADR 0040 stays** for every later release: from 1.0.0 on, `dev` and the live site start level, and a version's cut is again taken where its last task lands.

## The other choice

Cut at `df38b89` as written, walk the checklist on that branch's own preview URL, and bring each later fix across by hand. Then release 1.1 to 3.0 one by one, each with its short list. It's slower, and it means several small walks instead of one long one. If Adam prefers it, the notes and checklist from before this ADR are in git at `df38b89`.

## Consequences

- One long walk for Adam (about an hour, with the endings and an optional friend) instead of seven releases with their own walks.
- The live site gets ten more migrations at once (the Fellowship, the feed, challenges, quests and gifts, the wire, the site's AI ceilings, world events and both finales). They are the same migrations CI applies from nothing on every PR, and dev has already run them.
- A problem in a 2.x or 3.0 feature can now hold up 1.0.0. If one does, Adam can still choose the other cut above.
