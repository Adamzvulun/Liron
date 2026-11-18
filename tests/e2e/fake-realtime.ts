import type { Page, WebSocketRoute } from '@playwright/test';

/**
 * A stand-in for Supabase Realtime's socket (task 3.6), enough for the wire: it answers joins and
 * heartbeats, and passes each broadcast to the other pages on the same topic. supabase-js sends a
 * broadcast as a binary frame (kind 3); the relay passes it on as Phoenix's JSON form, which the
 * client reads too. Supabase's own pages describe the protocol only through supabase-js, so this
 * is shaped by what supabase-js 2.118 was seen to send.
 */
export function wireRelay() {
  const rooms = new Map<string, Set<WebSocketRoute>>();
  const sockets = new Set<WebSocketRoute>();
  let refuse = false;
  /** Every broadcast seen, for assertions: topic, event and payload. */
  const sent: { topic: string; event: string; payload: unknown }[] = [];

  const pass = (from: WebSocketRoute, topic: string, event: string, payload: unknown) => {
    sent.push({ topic, event, payload });
    for (const ws of rooms.get(topic) ?? []) {
      if (ws === from) continue;
      ws.send(
        JSON.stringify([null, null, topic, 'broadcast', { type: 'broadcast', event, payload }]),
      );
    }
  };

  /** Reads a binary user broadcast (kind 3): sizes, then join ref, ref, topic, event, metadata, payload. */
  const readBinary = (buf: Buffer) => {
    if (buf[0] !== 3) return null;
    const [joinLen, refLen, topicLen, eventLen, metaLen] = [buf[1], buf[2], buf[3], buf[4], buf[5]];
    let at = 7 + joinLen + refLen;
    const topic = buf.subarray(at, (at += topicLen)).toString('utf8');
    const event = buf.subarray(at, (at += eventLen)).toString('utf8');
    at += metaLen;
    const payload: unknown = JSON.parse(buf.subarray(at).toString('utf8') || 'null');
    return { topic, event, payload };
  };

  const leave = (ws: WebSocketRoute) => {
    sockets.delete(ws);
    for (const members of rooms.values()) members.delete(ws);
  };

  return {
    sent,
    /** Refuses every join from now on, as Realtime does when a policy says no. */
    refuseJoins(on = true) {
      refuse = on;
    },
    /** Cuts every connection, as a dropped network would; supabase-js reconnects by itself. */
    drop() {
      for (const ws of [...sockets]) {
        leave(ws);
        void ws.close({ code: 1006, reason: 'dropped' }).catch(() => undefined);
      }
    },
    async connect(page: Page) {
      await page.routeWebSocket(/\/realtime\/v1\/websocket/, (ws) => {
        sockets.add(ws);
        ws.onClose(() => leave(ws));
        ws.onMessage((message) => {
          if (typeof message !== 'string') {
            const b = readBinary(Buffer.from(message));
            if (b) pass(ws, b.topic, b.event, b.payload);
            return;
          }
          const [joinRef, ref, topic, event, payload] = JSON.parse(message) as [
            string | null,
            string | null,
            string,
            string,
            { type?: string; event?: string; payload?: unknown },
          ];
          const reply = (status: 'ok' | 'error', response: object = {}) =>
            ws.send(JSON.stringify([joinRef, ref, topic, 'phx_reply', { status, response }]));
          if (event === 'phx_join') {
            if (refuse) return reply('error', { reason: 'Unauthorized' });
            if (!rooms.has(topic)) rooms.set(topic, new Set());
            rooms.get(topic)?.add(ws);
            return reply('ok', { postgres_changes: [] });
          }
          if (event === 'phx_leave') {
            rooms.get(topic)?.delete(ws);
            return reply('ok');
          }
          if (event === 'broadcast' && payload?.event) {
            return pass(ws, topic, payload.event, payload.payload);
          }
          // Heartbeats, access tokens and anything else: acknowledged.
          return reply('ok');
        });
      });
    },
  };
}
