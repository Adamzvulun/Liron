// Nour, the lamplighter (docs/game/the-guide.md §2): the guide's look, painted with the
// players' own painter so they belong to the same city. The pole is added where they stand.
import type { Look } from '../avatar/looks.ts';

export const NOUR = 'Nour';

export const NOUR_LOOK: Look = {
  build: 'slim',
  skin: 'bronze',
  face: 'cheerful',
  hair: 'bun',
  hairColour: 'grey',
  beard: 'none',
  gear: { torso: 'coat', back: 'satchel' },
};
