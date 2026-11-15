/**
 * The browser side of "did it understand you?" (ADR 0014): sends one recording to our own
 * function (api/understood.ts), which asks Groq Whisper what it heard. Only ever called when
 * the learner presses the check button: nothing is sent otherwise.
 */

/** Why a check didn't give a transcript; the codes api/understood.ts answers with. */
export type SpeechProblem =
  | 'daily-limit'
  | 'busy'
  | 'too-big'
  | 'not-set-up'
  | 'signed-out'
  | 'not-allowed'
  | 'failed';

export class SpeechError extends Error {
  constructor(readonly problem: SpeechProblem) {
    super(`Speech check failed: ${problem}`);
    this.name = 'SpeechError';
  }
}

export interface Heard {
  /** What the speech model wrote down. */
  text: string;
  /** Checks left today. */
  left: number;
}

/** Where transcripts come from: our function in the app, a fake in tests. */
export interface SpeechSource {
  transcribe(audio: Blob): Promise<Heard>;
}

const KNOWN: readonly SpeechProblem[] = [
  'daily-limit',
  'busy',
  'too-big',
  'not-set-up',
  'signed-out',
  // The check is only for the deck's licensee (ADR 0014); retrying won't help (review, 2026-11-15).
  'not-allowed',
];

/** Our Vercel function, signed in with the learner's current access token. */
export function functionSpeech(
  token: () => Promise<string | null>,
  fetchFn: typeof fetch = (...args) => fetch(...args),
): SpeechSource {
  return {
    async transcribe(audio) {
      const access = await token();
      if (!access) throw new SpeechError('signed-out');
      const body = new FormData();
      body.append('audio', audio, 'phrase');
      let res: Response;
      try {
        res = await fetchFn('/api/understood', {
          method: 'POST',
          headers: { Authorization: `Bearer ${access}` },
          body,
        });
      } catch {
        throw new SpeechError('failed');
      }
      const json = (await res.json().catch(() => null)) as {
        text?: unknown;
        left?: unknown;
        error?: unknown;
      } | null;
      if (!res.ok || typeof json?.text !== 'string') {
        const problem = KNOWN.find((p) => p === json?.error) ?? 'failed';
        throw new SpeechError(problem);
      }
      return { text: json.text, left: Number(json.left ?? 0) };
    },
  };
}
