// Layouts the room must accept and refuse (task 7.2), shared with the database's tests (7.3) so
// the browser and save_home are held to the same cases. Each starts from the starter room.
import { STARTER, type Layout, type Placed, type Refusal } from './layout.ts';

const move = (id: string, change: Partial<Placed>): Layout => ({
  ...STARTER,
  pieces: STARTER.pieces.map((p) => (p.id === id ? ({ ...p, ...change } as Placed) : p)),
});
const without = (id: string): Layout => ({
  ...STARTER,
  pieces: STARTER.pieces.filter((p) => p.id !== id),
});
const plus = (...pieces: Placed[]): Layout => ({
  ...STARTER,
  pieces: [...STARTER.pieces, ...pieces],
});

/** Extra pieces the cases below own, beside the starter set. */
export const EXTRA = [
  { id: 'home-chair', name: 'chair', place: 'floor', size: [1, 1], does: 'sit', line: 'A chair.' },
  { id: 'home-clock', name: 'clock', place: 'wall', size: [1, 1], does: 'look', line: 'A clock.' },
] as const;

export const GOOD: { name: string; layout: Layout }[] = [
  { name: 'the starter room', layout: STARTER },
  { name: 'the chest moved to the middle', layout: move('home:chest', { at: [6, 1] }) },
  { name: 'a chair on the rug', layout: plus({ id: 'home-chair', at: [5, 2], facing: 'left' }) },
  { name: 'the bed turned', layout: move('home:bed', { facing: 'left' }) },
  {
    name: 'a clock where the picture was',
    layout: {
      ...STARTER,
      pieces: [...without('home:picture').pieces, { id: 'home-clock', slot: 0 }],
    },
  },
  {
    name: 'the picture and the letterbox swapped',
    layout: {
      ...STARTER,
      pieces: STARTER.pieces.map((p) =>
        p.id === 'home:picture'
          ? { ...p, slot: 2 }
          : p.id === 'home:letterbox'
            ? { ...p, slot: 0 }
            : p,
      ),
    },
  },
  { name: 'the picture stored', layout: without('home:picture') },
];

export const BAD: { name: string; layout: Layout; refusal: Refusal }[] = [
  {
    name: 'a piece nobody owns',
    layout: plus({ id: 'home-throne', at: [5, 2], facing: 'left' }),
    refusal: { why: 'unknown', id: 'home-throne' },
  },
  {
    name: 'the same piece twice',
    layout: plus({ id: 'home:chest', at: [5, 4], facing: 'left' }),
    refusal: { why: 'twice', id: 'home:chest' },
  },
  {
    name: 'a floor piece hung on the wall',
    layout: {
      ...STARTER,
      pieces: [...without('home:chest').pieces, { id: 'home:chest', slot: 2 }],
    },
    refusal: { why: 'wrong-place', id: 'home:chest' },
  },
  {
    name: 'off the edge of the floor',
    layout: move('home:chest', { at: [11, 3] }),
    refusal: { why: 'off-floor', id: 'home:chest' },
  },
  {
    name: 'on top of the bed',
    layout: move('home:chest', { at: [1, 1] }),
    refusal: { why: 'overlap', id: 'home:chest', with: 'home:bed' },
  },
  {
    name: 'in the doorway',
    layout: plus({ id: 'home-chair', at: [0, 4], facing: 'left' }),
    refusal: { why: 'on-door', id: 'home-chair' },
  },
  {
    name: 'on a wall slot that is taken',
    layout: plus({ id: 'home-clock', slot: 1 }),
    refusal: { why: 'slot-taken', id: 'home-clock', with: 'home:lantern' },
  },
  {
    name: 'under the shelf, which takes three slots',
    layout: plus({ id: 'home-clock', slot: 5 }),
    refusal: { why: 'slot-taken', id: 'home-clock', with: 'home:shelf' },
  },
  {
    name: 'a shelf hung across the window',
    layout: move('home:shelf', { slot: 2 }),
    refusal: { why: 'slot', id: 'home:shelf' },
  },
  {
    name: 'the cupboard stored',
    layout: without('home:cupboard'),
    refusal: { why: 'panel-missing', does: 'wardrobe' },
  },
  {
    name: 'a chair that walls in the door',
    layout: plus({ id: 'home-chair', at: [1, 4], facing: 'left' }),
    refusal: { why: 'cut-off', id: 'home:desk' },
  },
  {
    name: 'a wallpaper nobody has',
    layout: { ...STARTER, wallpaper: 'gold-leaf' },
    refusal: { why: 'style' },
  },
];
