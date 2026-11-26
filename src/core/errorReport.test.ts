import { describe, expect, it, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { reportError } from './errorReport.ts';

vi.stubGlobal('__APP_VERSION__', '9.9.9');

const fake = (session: object | null, rpc = vi.fn().mockResolvedValue({ error: null })) => ({
  rpc,
  client: {
    auth: { getSession: async () => ({ data: { session } }) },
    rpc,
  } as unknown as SupabaseClient,
});
const settle = () => new Promise((r) => setTimeout(r, 0));

// Only these are given; a read of the page's content (document) would throw.
vi.stubGlobal('window', {
  location: { pathname: '/arabic/slate', search: '?q=secret', hash: '#frag' },
});
vi.stubGlobal('navigator', { userAgent: 'UA' });
vi.stubGlobal(
  'document',
  new Proxy(
    {},
    {
      get: () => {
        throw new Error('read the page');
      },
    },
  ),
);

describe('reportError', () => {
  it('sends only the listed fields, and reads nothing the player typed', async () => {
    const { rpc, client } = fake({});
    const e = new Error('boom');
    e.stack = Array.from({ length: 30 }, (_, i) => `line ${i}`).join('\n');
    reportError(e, client);
    await settle();
    const args = rpc.mock.calls[0]?.[1] as Record<string, string>;
    expect(rpc.mock.calls[0]?.[0]).toBe('report_error');
    expect(Object.keys(args).sort()).toEqual([
      'p_message',
      'p_route',
      'p_stack',
      'p_user_agent',
      'p_version',
    ]);
    expect(args.p_route).toBe('/arabic/slate');
    expect(args.p_version).toBe('9.9.9');
    expect(args.p_stack?.split('\n')).toHaveLength(10);
    expect(JSON.stringify(args)).not.toContain('secret');
  });

  it('stays quiet when signed out or without a client', async () => {
    const { rpc, client } = fake(null);
    reportError(new Error('x'), client);
    reportError(new Error('x'), null);
    await settle();
    expect(rpc).not.toHaveBeenCalled();
  });

  it('swallows a failing call', async () => {
    const { client } = fake({}, vi.fn().mockRejectedValue(new Error('down')));
    expect(() => reportError(new Error('x'), client)).not.toThrow();
    await settle();
    expect(() =>
      reportError('plain string', { auth: null } as unknown as SupabaseClient),
    ).not.toThrow();
  });
});
