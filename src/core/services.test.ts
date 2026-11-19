import { describe, expect, it, vi } from 'vitest';
import { functionServices, serviceLines } from './services.ts';

const answering = (body: unknown, status = 200) =>
  vi.fn(async () => Response.json(body, { status })) as unknown as typeof fetch;

describe('what’s switched on (#316)', () => {
  it('asks our function as the player, once per page', async () => {
    const fetchFn = answering({ say: true, talk: false, radio: true });
    const services = functionServices(async () => 'token', fetchFn);
    expect(await services()).toEqual({ say: true, talk: false, radio: true });
    await services();
    expect(fetchFn).toHaveBeenCalledTimes(1);
    expect(fetchFn).toHaveBeenCalledWith('/api/services', {
      headers: { Authorization: 'Bearer token' },
    });
  });

  it('has no answer when signed out, refused, or sent something odd; and asks again later', async () => {
    expect(await functionServices(async () => null, answering({}))()).toBeNull();
    expect(
      await functionServices(async () => 't', answering({ error: 'failed' }, 502))(),
    ).toBeNull();
    expect(await functionServices(async () => 't', answering({ say: 'yes' }))()).toBeNull();
    const fetchFn = vi
      .fn()
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValue(Response.json({ say: true, talk: true, radio: true }));
    const services = functionServices(async () => 't', fetchFn as unknown as typeof fetch);
    expect(await services()).toBeNull();
    expect(await services()).toEqual({ say: true, talk: true, radio: true });
  });

  it('asks again after a token that couldn’t be read (review, 2026-11-19)', async () => {
    const token = vi.fn().mockRejectedValueOnce(new Error('storage')).mockResolvedValue('t');
    const services = functionServices(
      token as unknown as () => Promise<string | null>,
      answering({ say: true, talk: false, radio: true }),
    );
    expect(await services()).toBeNull();
    expect(await services()).toEqual({ say: true, talk: false, radio: true });
  });

  it('names each service the way its station does', () => {
    expect(serviceLines({ say: false, talk: true, radio: false })).toEqual([
      { name: 'Sit and talk', ready: true },
      { name: 'Say it', ready: false },
      { name: 'Radio operators', ready: false },
    ]);
  });
});
