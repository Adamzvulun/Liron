# How games and apps teach a newcomer their way around

- **Date:** 2026-11-22
- **For:** the guide for new players ([the-guide.md](../game/the-guide.md), [ADR 0053](../decisions/0053-a-guide-for-new-players.md)).
- **Question:** Waymark has a square with five places, an arena, two guild halls with many stations each, a top bar with six numbers, a compass, quests, contracts, chests, ranks, a Market, a House and a Fellowship. What helps a newcomer, most likely a friend on a phone who doesn't play games, feel at home in it?

## What the evidence says

### Up-front tutorials barely help; tips at the moment of need do

- **Nielsen Norman Group** tested deck-of-cards tutorials (the swipe-through screens before you start) with 70 people on four mobile apps. People who read them succeeded at tasks 91% of the time; people who skipped them, 94%. The skippers also found the tasks easier (5.49 against 4.92 out of 7) and were a little faster. NN/g's advice is to avoid onboarding flows where you can, make the interface clearer instead, and where help is needed, give it in context rather than as a tour of the whole interface, because people don't remember a long explanation. ([mobile tutorials](https://www.nngroup.com/articles/mobile-tutorials/), [mobile app onboarding](https://www.nngroup.com/articles/mobile-app-onboarding/), [onboarding tutorials](https://www.nngroup.com/articles/onboarding-tutorials/))
- **The limits:** a small study, four apps, one kind of tutorial. It shows that a front-loaded tour doesn't help; it doesn't measure how much contextual tips help. The case for those rests on NN/g's reasoning about memory and "pull" help (help that appears when there is a sign it's needed), not on a head-to-head test. I found none.

### Get to the fun first; ask for things later

- **Duolingo** moved its sign-up screen behind a first lesson. Its growth lead reported about 20% more daily active users from that, and a later round of changes added 8.2%; a quiet "Later" button beat the original design. These are the company's own figures, told in an interview, not a controlled study. ([First Round Review](https://review.firstround.com/the-tenets-of-a-b-testing-from-duolingos-master-growth-hacker))
- **Roblox's** design guidance for creators says the same in three rules: teach the essentials, get to the fun quickly, leave players wanting more. ([Roblox onboarding](https://create.roblox.com/docs/production/game-design/onboarding))
- Waymark already does this: the first page's main button goes straight to the Signal Tower's first lesson (three minutes, two sounds), and nothing asks for a name or a goal first.

### A guide character, and features introduced one at a time

- **Habitica** (a habit tracker dressed as an RPG, close to Waymark in spirit) has Justin, a guide who appears when the account is made and points out the main features. Reviews describe tips that appear the first time a feature is met rather than one long tutorial, and less important features held back until later (drops, which lead to pets, open at level 3). These are third-party descriptions; Habitica publishes no official account of its tutorial. ([Habitica wiki FAQ](https://habitica.fandom.com/wiki/FAQ), [screensdesign review](https://screensdesign.com/showcase/habitica-gamified-taskmanager))
- **Animal Crossing: New Horizons** introduces its island over the first days: the museum's owner arrives the next day, the shop and the airport (visits, multiplayer) open after the first tasks, and paying the first loan opens the next set. Each arrival is a character with a reason to be there. ([iMore](https://imore.com/animal-crossing-new-horizons-how-unlock-multiplayer-museum-shops-and-island-trips), [How-To Geek](https://www.howtogeek.com/664088/how-to-get-started-in-animal-crossing-new-horizons/))
- **Genshin Impact** opens whole systems by account rank: daily commissions at Adventure Rank 12, co-op at 16, the battle pass at 20 (guides agree on these; they may have moved since). A newcomer is never shown co-op before they know how to play alone. ([GameSpot](https://www.gamespot.com/articles/genshin-impact-complete-beginners-guide/1100-6497875/), [Shacknews](https://shacknews.com/article/120903/how-to-unlock-the-battle-pass-genshin-impact))
- **Design writing** makes the same point from the other side: showing everything at once is a reliable way to lose a newcomer, and a new system is best introduced at a calm moment, a story beat or a visit to the hub, not in the middle of an action. ([Game Developer: gating](https://www.gamedeveloper.com/design/examining-gating-in-game-design), [Game Developer: teaching mechanics](https://www.gamedeveloper.com/design/teaching-game-mechanics-a-hierarchy-of-learning))

### What Waymark learned itself

- **2026-11-16:** a new player's courtyard showed "The road comes here at step N" on six plaques at once, and it told them less than the lines it replaced ([the-road.md](../game/the-road.md) §6). A mark on everything is a mark on nothing.
- The compass (one line: what to do now) and the city errands (three prompts that appear once each, when they become true) are already "introduce it when it's useful". The guide extends them; it doesn't replace them.

## What this means for Waymark

1. **No front-loaded tour.** The first minutes stay as they are: the first page, then the first lesson.
2. **One voice, one line at a time,** at a calm moment: back in the square, on entering a place for the first time. Never in the middle of a lesson.
3. **A character with a reason to be there,** belonging to the square, not to either guild (the platform names no subject, [ADR 0003](../decisions/0003-hub-of-independent-subjects.md)).
4. **Nothing locked** (Adam, 2026-11-22: all open, introduced in order). What the games above do with locks, Waymark does with order: the guide introduces one place at a time, when it becomes useful.
5. **Help that can be pulled:** a Guidebook, always one tap away, for whatever the guide hasn't reached yet or the player has forgotten.

## Not verified

- No study here measures contextual tips against a tutorial head to head. The plan rests on NN/g's reasoning, the games' practice and our own lesson from 2026-11-16, and will be checked on real newcomers (Adam's friends): the spec's success measures say how.
