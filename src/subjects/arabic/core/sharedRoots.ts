// Shared Semitic roots (ADR 0002, "a 'you already know this' badge"): a taught word and the
// Hebrew word from the same root, from content/arabic/shared-roots.json. Only deck ids and our
// Hebrew: the deck stays private (ADR 0011).
import { z } from 'zod';
import pack from '../../../../content/arabic/shared-roots.json' with { type: 'json' };

const Kin = z.object({
  deck: z.string(),
  /** The Hebrew word that shares the root, unpointed: בית for بيت. */
  hebrew: z.string(),
  /** Its meaning, when it isn't the Arabic word's (בת: daughter, for بنت, girl). */
  note: z.string().optional(),
});
export type Kin = z.infer<typeof Kin>;

/** The Hebrew kin of each taught word that has one, by deck id. */
export const SHARED_ROOTS: ReadonlyMap<string, Kin> = new Map(
  pack.items.map((i) => {
    const kin = Kin.parse(i.data);
    return [kin.deck, kin];
  }),
);
