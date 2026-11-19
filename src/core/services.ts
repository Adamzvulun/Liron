/**
 * The browser side of "what's switched on" (#316): asks our own function (api/services.ts)
 * which of the site's AI services have a key. Booleans only; the keys never leave the server.
 */

/** What the site can do today (the function's answer). */
export interface Services {
  /** "Say it": the check that hears what you said. */
  say: boolean;
  /** Sit and talk at the inn, and the Coach. */
  talk: boolean;
  /** The Radio Room's operators answering in their own words. */
  radio: boolean;
}

/** Asks once per page; `null` when the answer couldn't be had (offline, signed out). */
export type ServicesSource = () => Promise<Services | null>;

const flag = (v: unknown): v is boolean => typeof v === 'boolean';

/** Our Vercel function, signed in with the player's current access token. */
export function functionServices(
  token: () => Promise<string | null>,
  fetchFn: typeof fetch = (...args) => fetch(...args),
): ServicesSource {
  let asked: Promise<Services | null> | null = null;
  const ask = async (): Promise<Services | null> => {
    try {
      // A token that can't be read is a failed ask too, tried again later (review, 2026-11-19).
      const access = await token();
      if (!access) return null;
      const res = await fetchFn('/api/services', {
        headers: { Authorization: `Bearer ${access}` },
      });
      if (!res.ok) return null;
      const json = (await res.json()) as Partial<Record<keyof Services, unknown>> | null;
      if (!json || !flag(json.say) || !flag(json.talk) || !flag(json.radio)) return null;
      return { say: json.say, talk: json.talk, radio: json.radio };
    } catch {
      return null;
    }
  };
  return () => {
    // A failed ask is tried again the next time Settings opens.
    asked ??= ask().then((s) => {
      if (!s) asked = null;
      return s;
    });
    return asked;
  };
}

/** The lines Settings shows, in plain words. */
export function serviceLines(s: Services): { name: string; ready: boolean }[] {
  return [
    { name: 'Sit and talk', ready: s.talk },
    { name: 'Say it', ready: s.say },
    { name: 'Radio operators', ready: s.radio },
  ];
}
