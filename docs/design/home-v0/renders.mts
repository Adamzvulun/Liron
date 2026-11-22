// The home's concept renders for task 7.1 (#436). Run from the repo root:
//   npx tsx docs/design/home-v0/renders.mts <out-dir>
// then screenshot each HTML file at 1920 × 1080 (docs/design/concept-v0/tools/render.js).
import { writeFileSync } from 'node:fs';
import { paintHome } from '../../../src/core/home/paintHome.ts';
import { STARTER, STARTER_PIECES, cellsOf, type Layout } from '../../../src/core/home/layout.ts';
import { avatarScale, cellFeet } from '../../../src/core/home/projection.ts';
import { paintAvatar } from '../../../src/core/avatar/paint.ts';
import { DEFAULT_LOOK } from '../../../src/core/avatar/looks.ts';
const out = process.argv[2];
const defs = new Map(STARTER_PIECES.map((d) => [d.id, d]));
const avatar = (c: number, r: number) => {
  const k = avatarScale(r), [x, y] = cellFeet(c, r);
  return { row: r, svg: `<g transform="translate(${x - 100 * k},${y - 300 * k}) scale(${k})">${paintAvatar(DEFAULT_LOOK, { idPrefix: `a${c}${r}` })}</g>` };
};
const page = (svg: string) => `<html><body style="margin:0"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1920 1080" width="1920" height="1080">${svg}</svg></body></html>`;
// 1. The starter room, the avatar by the door.
writeFileSync(`${out}/1-starter.html`, page(paintHome(STARTER, defs, { standing: [avatar(2, 4)] })));
// 2. Decorate: the grid shows, the chest is held over the middle of the room.
const moved: Layout = { ...STARTER, pieces: STARTER.pieces.map((p) => (p.id === 'home:chest' ? { ...p, at: [6, 1] as [number, number] } : p)) };
const chestDef = defs.get('home:chest');
if (!chestDef) throw new Error('no chest');
const chest = { id: 'home:chest', at: [6, 1] as [number, number], facing: 'left' as const };
writeFileSync(`${out}/2-decorate.html`, page(paintHome(moved, defs, { grid: true, marks: [{ cells: cellsOf(chest, chestDef), tone: 'held' }] })));
// 3. The scale check: the avatar at the back row and at the front row.
writeFileSync(`${out}/3-scale.html`, page(paintHome(STARTER, defs, { standing: [avatar(6, 0), avatar(3, 4)] })));
