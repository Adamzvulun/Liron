import { describe, expect, it, vi } from 'vitest';
import { checkInvite, inviteCode, inviteLink, joinWithInvite } from './invites.ts';

const CODE = 'ab'.repeat(32);

const answering = (body: unknown, status = 200) =>
  vi.fn(async () => Response.json(body, { status })) as unknown as typeof fetch;

describe('invite links (ADR 0052)', () => {
  it('a link is the join page with the code in its fragment', () => {
    expect(inviteLink('https://waymark.example', CODE)).toBe(
      `https://waymark.example/join#${CODE}`,
    );
  });

  it('reads the code only on the join page', () => {
    expect(inviteCode('/join', `#${CODE}`)).toBe(CODE);
    expect(inviteCode('/join/', `#${CODE.toUpperCase()}`)).toBe(CODE);
    expect(inviteCode('/', `#${CODE}`)).toBeNull();
    expect(inviteCode('/join', '#short')).toBeNull();
    expect(inviteCode('/join', '#access_token=x&type=invite')).toBeNull();
  });

  it('a check says open, closed, not set up or failed', async () => {
    expect(await checkInvite(CODE, answering({ open: true }))).toBe('open');
    expect(await checkInvite(CODE, answering({ open: false }))).toBe('closed');
    expect(await checkInvite(CODE, answering({ error: 'not-set-up' }, 503))).toBe('not-set-up');
    expect(await checkInvite(CODE, answering({ error: 'failed' }, 502))).toBe('failed');
    const offline = vi.fn(async () => {
      throw new Error('offline');
    }) as unknown as typeof fetch;
    expect(await checkInvite(CODE, offline)).toBe('failed');
  });

  it('joining answers null when the account is made, else what went wrong', async () => {
    const join = { code: CODE, email: 'f@x.com', password: 'long enough' };
    const fetchFn = answering({ ok: true });
    expect(await joinWithInvite(join, fetchFn)).toBeNull();
    expect(vi.mocked(fetchFn).mock.calls[0]?.[0]).toBe('/api/join');
    expect(JSON.parse(String(vi.mocked(fetchFn).mock.calls[0]?.[1]?.body))).toEqual({
      action: 'join',
      ...join,
    });
    for (const error of ['used', 'email-taken', 'weak-password', 'not-set-up'])
      expect(await joinWithInvite(join, answering({ error }, 409))).toBe(error);
    expect(await joinWithInvite(join, answering({ error: 'odd' }, 500))).toBe('failed');
  });
});
