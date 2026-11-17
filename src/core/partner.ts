/**
 * The browser side of the AI partner (E15, ADR 0004, 0007, 0036): asks our own function
 * (api/partner.ts) for one line a character says. The function holds the keys and the prompt,
 * and asks Gemini, or Groq when Gemini fails. Every caller has a scripted line to fall back on,
 * so a failure here is never shown to the learner as an error.
 */

/**
 * What a partner is asked to write: two lines of a Radio Room operator (ADR 0036, 0037),
 * `radio-news`, their news in the chat turn, and `radio-reply`, their answer to the news you keyed;
 * `inn-chat`, a regular's next line in an Arabic chat at the inn (E17, ADR 0038); and `inn-coach`,
 * the Coach's tips after that chat, as JSON in the reply's text (`{ tips: CoachTip[] }`).
 */
export type PartnerAsk = RadioNewsAsk | RadioReplyAsk | InnChatAsk | InnCoachAsk;

/** One line of a chat at the inn: `them` is the regular, `you` the learner. */
export interface InnTurn {
  who: 'them' | 'you';
  text: string;
}

/**
 * A regular's next line at the inn (ADR 0038). Answered by Groq only, in Palestinian Arabic, and
 * counted against the day's 60 chat lines, apart from the radio's replies.
 */
export interface InnChatAsk {
  kind: 'inn-chat';
  /** The regular's road number: the function reads their story and chapter from our content. */
  regular: number;
  /** The name the regulars know you by. */
  learner: { name: string };
  /** The last few things you said to this regular in earlier chats, oldest first. */
  told: readonly string[];
  /** How many chats with this regular came before this one (their reputation). */
  met: number;
  /** Whether their trial is passed, so the road you shared is something they remember. */
  shared: boolean;
  /** This chat so far, oldest first; empty for their opening line. */
  turns: readonly InnTurn[];
}

/** The Coach's debrief after a chat at the inn (ADR 0007, 0038): only the chat itself is sent. */
export interface InnCoachAsk {
  kind: 'inn-coach';
  turns: readonly InnTurn[];
}

/** One of the Coach's tips: a line of yours, how a Palestinian would say it, and why. */
export interface CoachTip {
  said: string;
  better: string;
  why: string;
}

interface RadioAsk {
  /** The operator's id (`ruth`): the function reads who they are from our own content. */
  operator: string;
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
export type PartnerProblem =
  'daily-limit' | 'site-limit' | 'busy' | 'not-set-up' | 'signed-out' | 'failed';

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

const KNOWN: readonly PartnerProblem[] = [
  'daily-limit',
  'site-limit',
  'busy',
  'not-set-up',
  'signed-out',
];

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
