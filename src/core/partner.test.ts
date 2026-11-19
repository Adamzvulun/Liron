import { describe, expect, it, vi } from 'vitest';
import { functionPartner, PartnerError, type PartnerAsk } from './partner.ts';

const ask = { heard: 'CQ CQ DE K1ABC' } as PartnerAsk;
const answering = (body: unknown, status = 200) =>
  vi.fn(async () => Response.json(body, { status })) as unknown as typeof fetch;
const problem = (p: Promise<unknown>) =>
  p.then(
    () => 'answered',
    (e: unknown) => (e instanceof PartnerError ? e.problem : `not a PartnerError: ${String(e)}`),
  );

describe('the partner, through our function (review, 2026-11-19)', () => {
  it('sends the ask, signed in, and answers the line and what is left', async () => {
    const fetchFn = answering({ text: 'R R TNX', left: 41 });
    const partner = functionPartner(async () => 'token', fetchFn);
    expect(await partner.reply(ask)).toEqual({ text: 'R R TNX', left: 41 });
    expect(fetchFn).toHaveBeenCalledWith('/api/partner', {
      method: 'POST',
      headers: { Authorization: 'Bearer token', 'Content-Type': 'application/json' },
      body: JSON.stringify(ask),
    });
  });

  it('says why there was no reply, with the codes the function uses', async () => {
    const reply = (fetchFn: typeof fetch, token = async (): Promise<string | null> => 't') =>
      problem(functionPartner(token, fetchFn).reply(ask));
    expect(await reply(answering({}), async () => null)).toBe('signed-out');
    expect(await reply(answering({ error: 'daily-limit' }, 429))).toBe('daily-limit');
    expect(await reply(answering({ error: 'site-limit' }, 429))).toBe('site-limit');
    expect(await reply(answering({ error: 'busy' }, 503))).toBe('busy');
    expect(await reply(answering({ error: 'not-set-up' }, 503))).toBe('not-set-up');
    // Anything else, an odd body or no connection at all, is a plain failure.
    expect(await reply(answering({ error: 'teapot' }, 418))).toBe('failed');
    expect(await reply(answering({ text: 5 }))).toBe('failed');
    expect(await reply(vi.fn(async () => new Response('<html>', { status: 502 })))).toBe('failed');
    expect(
      await reply(vi.fn(() => Promise.reject(new Error('offline'))) as unknown as typeof fetch),
    ).toBe('failed');
    // A token that can't be read is a PartnerError too.
    expect(await reply(answering({ text: 'x' }), () => Promise.reject(new Error('storage')))).toBe(
      'failed',
    );
  });

  it('counts an odd "left" as none', async () => {
    const partner = functionPartner(async () => 't', answering({ text: 'GM', left: 'many' }));
    expect(await partner.reply(ask)).toEqual({ text: 'GM', left: 0 });
  });
});
