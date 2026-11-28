// Verb shapes (ADR 0002, "pattern badges"): a taught verb whose Arabic shape matches a Hebrew
// binyan, from content/arabic/verb-shapes.json. Only the four clean pairs are named: the doubled
// middle (form II) is piʿel, t- with it (form V) is hitpaʿel, in- (form VII) is nifʿal, and a-
// (form IV) is hifʿil. See docs/research/verb-shapes.md. Only deck ids: the deck stays private.
import { z } from 'zod';
import pack from '../../../../content/arabic/verb-shapes.json' with { type: 'json' };

export const BINYANIM = ['piel', 'hitpael', 'nifal', 'hifil'] as const;
export type Binyan = (typeof BINYANIM)[number];

const Shape = z.object({ deck: z.string(), shape: z.enum(BINYANIM) });

/** Each shaped verb's binyan, by deck id. */
export const VERB_SHAPES: ReadonlyMap<string, Binyan> = new Map(
  pack.items.map((i) => {
    const s = Shape.parse(i.data);
    return [s.deck, s.shape];
  }),
);

/** What a binyan is called, a Hebrew verb in it, and how the Arabic shows it. */
export const BINYAN: Readonly<Record<Binyan, { name: string; example: string; how: string }>> = {
  piel: {
    name: 'piʿel',
    example: 'דִּבֵּר',
    how: 'A doubled middle letter, the shadda, as in Hebrew’s piʿel.',
  },
  hitpael: {
    name: 'hitpaʿel',
    example: 'הִתְלַבֵּשׁ',
    how: 'it- in front and a doubled middle letter, as in Hebrew’s hitpaʿel: often something you do to yourself.',
  },
  nifal: {
    name: 'nifʿal',
    example: 'נִכְנַס',
    how: 'in- in front of the root, as in Hebrew’s nifʿal: often something that happens to you.',
  },
  hifil: {
    name: 'hifʿil',
    example: 'הִזְמִין',
    how: 'a- in front of the root, where Hebrew’s hifʿil has ha-: often making something happen. Spoken Arabic uses it less.',
  },
};
