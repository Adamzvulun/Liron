// What the Radio Room remembers (E16): your station and the logbook. Kept apart from onAir.ts so
// the Morse progress can hold it without importing the cast. Design: docs/game/radio-qso.md.

import { z } from 'zod';

/** Contacts the logbook keeps. */
export const LOG_KEEP = 100;

export const radioSchema = z
  .object({
    call: z
      .string()
      .regex(/^[A-Z0-9]+$/)
      .nullable()
      .catch(null),
    name: z
      .string()
      .regex(/^[A-Z]{1,8}$/)
      .nullable()
      .catch(null),
    qth: z
      .string()
      .regex(/^[A-Z]{1,10}$/)
      .nullable()
      .catch(null),
    /** Contacts logged, all time. */
    contacts: z.number().int().min(0).catch(0),
    /** The latest contacts, newest last: the operator, the day and whether it made the log. */
    log: z
      .array(z.object({ op: z.string(), day: z.string(), ok: z.boolean() }))
      .max(LOG_KEEP)
      .catch([]),
  })
  .catch({ call: null, name: null, qth: null, contacts: 0, log: [] });

export type Radio = z.infer<typeof radioSchema>;
