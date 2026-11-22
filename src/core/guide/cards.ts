// A subject's first-visit cards (the-guide.md §3.4, R13; #411), read from its own guide.json:
// one item per hall or station, `guide-card-<key>`, typed `guide-card`. The subject passes its
// pack and gets the words back by key; the platform names no subject.
import { z } from 'zod';

const Card = z.object({
  title: z.string().min(1),
  text: z.string().min(1),
  speaker: z.string().min(1).optional(),
});
export type CardWords = z.infer<typeof Card>;

/** The cards in a subject's pack, by key (`hall`, `lessons`, …). */
export function cardsFrom(pack: {
  items: readonly { id: string; type: string; data: unknown }[];
}): ReadonlyMap<string, CardWords> {
  return new Map(
    pack.items
      .filter((i) => i.type === 'guide-card')
      .map((i) => [i.id.replace(/^guide-card-/, ''), Card.parse(i.data)]),
  );
}
