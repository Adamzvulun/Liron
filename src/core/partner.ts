/**
 * The browser side of the AI partner (E15, ADR 0004, 0007, 0036): asks our own function
 * (api/partner.ts) for one line a character says. The function holds the keys and the prompt,
 * and asks Gemini, or Groq when Gemini fails. Every caller has a scripted line to fall back on,
 * so a failure here is never shown to the learner as an error.
 */

/**
 * What a partner is asked to write. So far, two lines of a Radio Room operator (ADR 0036, 0037):
 * `radio-news`, their news in the chat turn, and `radio-reply`, their answer to the news you keyed.
 */
export type PartnerAsk = RadioNewsAsk | RadioReplyAsk;

interface RadioAsk {
  /** The character: who they are, and a few words about them (our own content). */
  persona: { who: string; about: string };
  /** The learner as the character knows them: the name and town they keyed, contacts so far. */
  learner: { name: string; place: string; contacts: number };
  /** The character's own lines in earlier talks with this learner, oldest first (its memory). */
  past: readonly string[];
  /** What the learner keyed as their own news in earlier talks, oldest first (ADR 0037). */
  told?: readonly string[];
}

export interface RadioNewsAsk extends RadioAsk {
  kind: 'radio-news';
}

export interface RadioReplyAsk extends RadioAsk {
  kind: 'radio-reply';
  /** The character's own news in this contact, if they told any. */
  news?: string;
  /** What the learner keyed just now, as the decoder read it: the line to answer. */
  heard: string;
}

export interface PartnerReply {
  text: string;
  /** Replies left today. */
  left: number;
}

/** Why there was no reply; the codes api/partner.ts answers with. */
export type PartnerProblem = 'daily-limit' | 'busy' | 'not-set-up' | 'signed-out' | 'failed';

export class PartnerError extends Error {
  constructor(readonly problem: PartnerProblem) {
    super(`Partner reply failed: ${problem}`);
    this.name = 'PartnerError';
  }
}

/** Where partner lines come from: our function in the app, a fake in tests. */
export interface PartnerSource {
  reply(ask: PartnerAsk): Promise<PartnerReply>;
}

const KNOWN: readonly PartnerProblem[] = ['daily-limit', 'busy', 'not-set-up', 'signed-out'];

/** Our Vercel function, signed in with the learner's current access token. */
export function functionPartner(
  token: () => Promise<string | null>,
  fetchFn: typeof fetch = (...args) => fetch(...args),
): PartnerSource {
  return {
    async reply(ask) {
      const access = await token();
      if (!access) throw new PartnerError('signed-out');
      let res: Response;
      try {
        res = await fetchFn('/api/partner', {
          method: 'POST',
          headers: { Authorization: `Bearer ${access}`, 'Content-Type': 'application/json' },
          body: JSON.stringify(ask),
        });
      } catch {
        throw new PartnerError('failed');
      }
      const json = (await res.json().catch(() => null)) as {
        text?: unknown;
        left?: unknown;
        error?: unknown;
      } | null;
      if (!res.ok || typeof json?.text !== 'string') {
        throw new PartnerError(KNOWN.find((p) => p === json?.error) ?? 'failed');
      }
      return { text: json.text, left: Number(json.left ?? 0) };
    },
  };
}
