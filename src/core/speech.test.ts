import { describe, expect, it, vi } from 'vitest';
import { functionSpeech, SpeechError } from './speech.ts';
import { subjectApi } from './progress/subjectApi.ts';
import { memoryStore } from './progress/store.ts';

const audio = new Blob([new Uint8Array(10)], { type: 'audio/webm' });

const answering = (res: () => Response) => {
  const calls: { url: string; init?: RequestInit }[] = [];
  const fetchFn = vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
    calls.push({ url: String(url), init });
    return res();
  }) as unknown as typeof fetch;
  return { calls, fetchFn };
};

const problem = (p: Promise<unknown>) =>
  p.then(
    () => 'no error',
    (e: unknown) => (e instanceof SpeechError ? e.problem : `other: ${String(e)}`),
  );

describe('functionSpeech (ADR 0014)', () => {
  it('posts the recording to our function as the learner and returns what was heard', async () => {
    const { calls, fetchFn } = answering(() => Response.json({ text: 'مرحبا', left: 41 }));
    const speech = functionSpeech(async () => 'token-1', fetchFn);
    expect(await speech.transcribe(audio)).toEqual({ text: 'مرحبا', left: 41 });
    expect(calls[0]?.url).toBe('/api/understood');
    expect(calls[0]?.init?.headers).toEqual({ Authorization: 'Bearer token-1' });
    expect((calls[0]?.init?.body as FormData).get('audio')).toBeInstanceOf(Blob);
  });

  it('sends nothing when signed out', async () => {
    const { calls, fetchFn } = answering(() => Response.json({}));
    expect(await problem(functionSpeech(async () => null, fetchFn).transcribe(audio))).toBe(
      'signed-out',
    );
    expect(calls).toHaveLength(0);
  });

  it("names the function's errors, and anything unknown as failed", async () => {
    for (const [res, expected] of [
      [() => Response.json({ error: 'daily-limit' }, { status: 429 }), 'daily-limit'],
      [() => Response.json({ error: 'busy' }, { status: 503 }), 'busy'],
      [() => Response.json({ error: 'too-big' }, { status: 413 }), 'too-big'],
      [() => Response.json({ error: 'not-set-up' }, { status: 503 }), 'not-set-up'],
      [() => Response.json({ error: 'not-allowed' }, { status: 403 }), 'failed'],
      [() => new Response('<html>404</html>', { status: 404 }), 'failed'],
      [
        () => {
          throw new TypeError('offline');
        },
        'failed',
      ],
    ] as const) {
      const { fetchFn } = answering(res);
      expect(await problem(functionSpeech(async () => 't', fetchFn).transcribe(audio))).toBe(
        expected,
      );
    }
  });

  it('subjectApi passes recordings to the speech source, and says not set up without one', async () => {
    const transcribe = vi.fn(async () => ({ text: 'هلا', left: 3 }));
    const api = subjectApi({ id: 'arabic' }, memoryStore(), undefined, null, { transcribe });
    expect(await api.transcribe(audio)).toEqual({ text: 'هلا', left: 3 });
    expect(transcribe).toHaveBeenCalledWith(audio);
    expect(await problem(subjectApi({ id: 'arabic' }, memoryStore()).transcribe(audio))).toBe(
      'not-set-up',
    );
  });
});
