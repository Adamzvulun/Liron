/**
 * "Did it understand you?" (ADR 0014): a Vercel function (ADR 0011 #3) that writes down what
 * Groq Whisper hears in a learner's recording. The browser compares that with the phrase.
 *
 * POST /api/understood, `Authorization: Bearer <the learner's Supabase access token>`, a
 * multipart body with the recording as `audio`. Answers `{ text, left }`: the transcript and how
 * many checks are left today. Errors answer `{ error }` with one of the codes in `SpeechFailure`.
 *
 * Nothing is stored here: the recording goes to Groq and the answer comes back. The Supabase
 * call (claim_speech_check) proves sign-in and licence and takes one of today's checks.
 *
 * Self-contained on purpose: Vercel compiles this file on its own, so it imports nothing from
 * src/ (whose imports end in `.ts`).
 */

export interface Env {
  GROQ_API_KEY?: string;
  VITE_SUPABASE_URL?: string;
  VITE_SUPABASE_PUBLISHABLE_KEY?: string;
}

/** The error codes the function answers with; src/core/speech.ts maps them to messages. */
export type SpeechFailure =
  | 'method'
  | 'signed-out'
  | 'not-allowed'
  | 'not-set-up'
  | 'too-big'
  | 'no-audio'
  | 'daily-limit'
  | 'site-limit'
  | 'busy'
  | 'failed';

/**
 * A phrase takes a few seconds. 500 KB is about 30 s at Chrome's default 128 kbit/s Opus, so 100
 * checks a day stay far inside Groq's free 28,800 audio-seconds a day (and Vercel's 4.5 MB body).
 */
export const MAX_AUDIO_BYTES = 500_000;

const GROQ_URL = 'https://api.groq.com/openai/v1/audio/transcriptions';
/** The settings from docs/research/spikes/gemini-speech/groq.mjs (ADR 0014). */
const GROQ = {
  model: 'whisper-large-v3',
  language: 'ar',
  temperature: '0',
  response_format: 'json',
  prompt: 'هاد كلام باللهجة الفلسطينية: بدّي أروح عَ البيت هلقيت، تلات ساعات، برّا.',
} as const;

const STATUS: Record<SpeechFailure, number> = {
  method: 405,
  'signed-out': 401,
  'not-allowed': 403,
  'not-set-up': 503,
  'too-big': 413,
  'no-audio': 400,
  'daily-limit': 429,
  // Everyone's checks for today are used up (ADR 0041).
  'site-limit': 429,
  busy: 503,
  failed: 502,
};

const answer = (body: object, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });
const fail = (error: SpeechFailure) => answer({ error }, STATUS[error]);

/** Takes one of today's checks as the learner: how many are left, or why not. */
async function claim(
  env: Required<Env>,
  token: string,
  fetchFn: typeof fetch,
): Promise<number | SpeechFailure> {
  let res: Response;
  try {
    res = await fetchFn(`${env.VITE_SUPABASE_URL}/rest/v1/rpc/claim_speech_check`, {
      method: 'POST',
      headers: {
        apikey: env.VITE_SUPABASE_PUBLISHABLE_KEY,
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: '{}',
    });
  } catch {
    return 'failed';
  }
  if (res.status === 401) return 'signed-out';
  if (res.status === 403) return 'not-allowed';
  if (!res.ok) return 'failed';
  const left = Number(await res.json().catch(() => NaN));
  if (!Number.isInteger(left)) return 'failed';
  if (left === -2) return 'site-limit';
  return left < 0 ? 'daily-limit' : left;
}

/** The handler, with its environment and `fetch` passed in so tests can fake both. */
export async function handle(
  request: Request,
  env: Env,
  fetchFn: typeof fetch = fetch,
): Promise<Response> {
  if (request.method !== 'POST') return fail('method');
  const token = /^Bearer (\S+)$/.exec(request.headers.get('Authorization') ?? '')?.[1];
  if (!token) return fail('signed-out');
  const { GROQ_API_KEY, VITE_SUPABASE_URL, VITE_SUPABASE_PUBLISHABLE_KEY } = env;
  if (!GROQ_API_KEY || !VITE_SUPABASE_URL || !VITE_SUPABASE_PUBLISHABLE_KEY) {
    return fail('not-set-up');
  }
  const size = Number(request.headers.get('Content-Length') ?? 0);
  if (size > MAX_AUDIO_BYTES + 10_000) return fail('too-big');

  let audio: FormDataEntryValue | null;
  try {
    audio = (await request.formData()).get('audio');
  } catch {
    return fail('no-audio');
  }
  if (!(audio instanceof Blob) || audio.size === 0) return fail('no-audio');
  if (audio.size > MAX_AUDIO_BYTES) return fail('too-big');
  if (!/^(audio|video)\/[\w.+-]+/.test(audio.type)) return fail('no-audio');

  const left = await claim(
    { GROQ_API_KEY, VITE_SUPABASE_URL, VITE_SUPABASE_PUBLISHABLE_KEY },
    token,
    fetchFn,
  );
  if (typeof left !== 'number') return fail(left);

  const form = new FormData();
  // Groq reads the format from the file name; MediaRecorder records WebM (Chrome) or MP4 (Safari).
  form.append('file', audio, audio.type.includes('mp4') ? 'phrase.mp4' : 'phrase.webm');
  for (const [key, value] of Object.entries(GROQ)) form.append(key, value);
  let res: Response;
  try {
    res = await fetchFn(GROQ_URL, {
      method: 'POST',
      headers: { Authorization: `Bearer ${GROQ_API_KEY}` },
      body: form,
    });
  } catch {
    return fail('failed');
  }
  if (res.status === 429) return fail('busy');
  if (!res.ok) return fail('failed');
  const body = (await res.json().catch(() => null)) as { text?: unknown } | null;
  if (typeof body?.text !== 'string') return fail('failed');
  return answer({ text: body.text.trim().slice(0, 500), left });
}

export default {
  fetch: (request: Request) => handle(request, process.env),
};
