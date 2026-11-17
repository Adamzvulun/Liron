# World events (task 4.4, #336)

A few weeks a year the city keeps an event. Each one comes with:

- **Bunting** strung across the square, in the event's colors.
- **A notice** pinned above the Notice Board's quests.
- **A themed contract,** which takes the last place on the day's board.
- **The event's own chest** for finishing the day's three contracts, instead of the wooden one.

The calendar is data, in `content/core/events.json`, and the database holds the same dates (`world_events`; a schema test checks that they match). Events start and end by the player's **local day**, every year, with no deploy.

| Event | Week | Why then | Contract | Chest |
|---|---|---|---|---|
| World Radio Day | 10–16 February | UNESCO's World Radio Day is 13 February | 2 rounds of Instant Recognition | Signal chest |
| World Amateur Radio Day | 15–21 April | The IARU's World Amateur Radio Day is 18 April | A sending drill at 80% | Beacon chest |
| The Olive Harvest | 20–26 October | The olive harvest in the Levant runs from October into November | Two rounds of phrases at the coffee corner | Olive-wood chest |
| World Arabic Language Day | 15–21 December | UNESCO's World Arabic Language Day is 18 December | Write letters on the slate | Scribe's chest |

**Why these four:** two for each guild, spread over the year, all on fixed dates. Feasts that follow the lunar calendar (Ramadan, the Eids) move by about eleven days a year, and a fixed calendar can't hold them. Adding a lunar feast would need a table of its dates for each year, so it is left out for now. *Chosen in Adam's place, 2026-11-17; he can add, move or drop any of these. Each change is an edit to `events.json` and a migration with the same dates.*

## Rules

- **Fair:** an event's contract is offered only for a guild the player has started, and only if nothing else locks it. If the player hasn't started that guild, the board is an ordinary one.
- **Missing an event loses nothing:** the chest is a bonus in place of the wooden one, worth a little more (30–70 gold, a 30% chance of a gem). Nothing earned before is taken away, and no gear is limited to an event.
- **The square stays fast:** the bunting is one small SVG drawn in the page, and it never catches a tap. The speed budget (CI.md) runs on an ordinary day.
- **If two events ever overlap,** the one that starts first in the year wins, in the browser and in the database alike.
