// The house, the market and the notice board: views loaded when you go there, not with the
// square (#137). App.tsx loads this file lazily.
import { HallBackdrop } from './city/HallBackdrop.tsx';
import { HOUSE_STAGE, paintHouse } from './city/paintHouse.ts';
import { MARKET_STAGE, paintMarket } from './city/paintMarket.ts';
import { NOTICE_WALL_STAGE, paintNoticeWall } from './city/paintNoticeWall.ts';
import { ARENA_STAGE, paintArena } from './city/paintArena.ts';

export { AchievementWall } from './achievements/AchievementWall.tsx';
export { Wardrobe } from './avatar/Wardrobe.tsx';
export { ChestShelf } from './player/Chests.tsx';
export { Market } from './player/Market.tsx';
export { Ledger } from './player/Ledger.tsx';
export { MilestoneCheck } from './milestone/MilestoneCheck.tsx';
export { Fellowship } from './fellowship/Fellowship.tsx';
export { FriendHouse } from './fellowship/FriendHouse.tsx';
export { HouseRoom } from './home/HouseRoom.tsx';
export { PartyFeed } from './fellowship/PartyFeed.tsx';
export { Arena } from './fellowship/Arena.tsx';
export { TogetherQuest } from './fellowship/TogetherQuest.tsx';

export function HouseBackdrop() {
  return <HallBackdrop id="house" {...HOUSE_STAGE} paint={paintHouse} />;
}

export function MarketBackdrop() {
  return <HallBackdrop id="market" {...MARKET_STAGE} paint={paintMarket} />;
}

export function BoardBackdrop() {
  return <HallBackdrop id="board" {...NOTICE_WALL_STAGE} paint={paintNoticeWall} />;
}

export function ArenaBackdrop() {
  return <HallBackdrop id="arena" {...ARENA_STAGE} paint={paintArena} />;
}
