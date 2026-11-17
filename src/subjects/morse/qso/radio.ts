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
    /** A contact logged at 25 wpm or faster with no repeats asked: the Signal Master's QSO. */
    cleanFast: z.boolean().catch(false),
    /** The latest contacts, newest last: the operator, the day and whether it made the log. */
    log: z
      .array(z.object({ op: z.string(), day: z.string(), ok: z.boolean() }))
      .max(LOG_KEEP)
      .catch([]),
    /**
     * Each operator's own news lines with you, newest last (E15, ADR 0036): their memory of you,
     * so a story carries on. Kept here, in Supabase, never at the AI provider.
     */
    notes: z
      .record(z.string(), z.array(z.string().max(80)).max(3))
      .optional()
      .catch(undefined),
    /** What you keyed as your own news to each operator, newest last (ADR 0037). */
    told: z
      .record(z.string(), z.array(z.string().max(60)).max(3))
      .optional()
      .catch(undefined),
  })
  .catch({ call: null, name: null, qth: null, contacts: 0, cleanFast: false, log: [] });

export type Radio = z.infer<typeof radioSchema>;
