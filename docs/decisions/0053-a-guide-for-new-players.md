# 0053 — A guide for new players

- **Status:** Accepted (Adam, 2026-11-22: chose the guide character with tips at the moment of need, every place open and introduced in order, invited friends first, a new city character).
- **Date:** 2026-11-22
- **Spec:** [the-guide.md](../game/the-guide.md). **Research:** [new-player-guides.md](../research/new-player-guides.md).

## Context

Waymark has grown to five places and an arena on the square, two halls with a dozen stations each, six numbers in the top bar, quests, contracts, chests, ranks, a Market, a House and a Fellowship. Since invite links (ADR 0052), the newcomer is a friend on a phone who may never have played a game. The first page and the compass tell them what to do next; nothing tells them what anything *is*. Adam asked for a guide that helps a new player get comfortable and find their way around.

## Options considered

1. **A tour up front** (coach marks pointing at each part of the screen on arrival). Quick to build. Nielsen Norman Group's test of up-front tutorials found they didn't help people do tasks (91% success with, 94% without), and people forget them. Not chosen.
2. **A Guidebook only.** Always right, never in the way, but a newcomer doesn't know what to look up, so it helps the curious and not the lost. Kept as one part of the answer.
3. **Opening the city gradually** (places locked until the road reaches them, as Animal Crossing and Genshin Impact do). The calmest first day, but it takes away what friends can already do and changes the game's shape. Not chosen: Adam keeps everything open.
4. **A guide character, with tips at the moment of need, introductions in order, and a Guidebook.** What Habitica does, and what the research favors. Costs the most to build. **Chosen.**

## Decision

1. **A new character, Nour the lamplighter** (the name chosen by Adam on 2026-11-22; the look is Adam's to approve), who belongs to the square and to neither guild. They stand by the compass.
2. **Nothing before the first lesson.** The first page and the first lesson stay as they are.
3. **A three-line welcome** on the square after the first step: the compass line, the top bar, the places. It can be skipped, and replayed from the Guidebook.
4. **Introductions, one at a time,** when each place becomes useful (the order and conditions are in the spec, §3.3). Only one place wears a "new" mark at a time. The three city errands become introductions.
5. **A first-visit card** in each place and station: two sentences, not blocking, closed by the first action. Guild cards come from each subject's content through the subject contract (ADR 0019), so the platform names no subject.
6. **A Guidebook,** reached by tapping the Lamplighter or from Settings, with a page for every place, number and system. Its numbers are read from code. A test checks it is complete.
7. **What has been seen is saved on the account** (`guide_seen` on the profile), and derived from the player's state where possible, so existing players aren't greeted as strangers.
8. **One voice at a time:** the guide waits for level-ups, goals reached and chests, and is never a modal dialog.

## Consequences

- **Easier:** a friend can arrive by link and find their way without Adam on the phone. Every new place or station from now on comes with its card and its Guidebook page, or a test fails.
- **Harder:** every new feature needs words in two more places (a card and a page). A database column is added to the profile (a migration on both projects, applied by the DB migrate run as usual).
- **Costs and data:** no money, no new service. `guide_seen` holds only the ids of the lines a player has been shown, on their own profile row.
- **Revisit:** after the first real newcomer has tried it (spec §9). If they still get lost, consider holding the Arena and the second hall back further in the order, not locking them.
