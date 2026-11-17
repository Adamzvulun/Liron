import { describe, expect, it } from 'vitest';
import { RecorderCore, type RecorderState } from './useRecorder.ts';

function fakeStream() {
  const track = {
    stopped: false,
    stop() {
      this.stopped = true;
    },
  };
  return { track, stream: { getTracks: () => [track] } as unknown as MediaStream };
}

function setup(opts: { failMake?: boolean; deny?: boolean } = {}) {
  const opened: ReturnType<typeof fakeStream>[] = [];
  let resolve: (() => void)[] = [];
  const media = {
    getUserMedia: () =>
      new Promise<MediaStream>((ok, no) => {
        resolve.push(() => {
          if (opts.deny) return no(new Error('denied'));
          const s = fakeStream();
          opened.push(s);
          ok(s.stream);
        });
      }),
  };
  const make = () => {
    if (opts.failMake) throw new Error('no recorder');
    const rec = {
      state: 'inactive',
      mimeType: 'audio/webm',
      ondataavailable: null as ((e: { data: Blob }) => void) | null,
      onstop: null as (() => void) | null,
      start() {
        this.state = 'recording';
      },
      stop() {
        this.state = 'inactive';
        this.onstop?.();
      },
    };
    return rec as unknown as MediaRecorder;
  };
  const states: RecorderState[] = [];
  const blobs: Blob[] = [];
  const core = new RecorderCore(
    media,
    make,
    (s) => states.push(s),
    (b) => blobs.push(b),
  );
  const answer = async () => {
    const r = resolve;
    resolve = [];
    r.forEach((f) => f());
    await new Promise((ok) => setTimeout(ok, 0));
  };
  return { core, opened, states, blobs, answer };
}

describe('RecorderCore (security review M4)', () => {
  it('records, then releases the microphone on stop', async () => {
    const t = setup();
    const started = t.core.start();
    await t.answer();
    await started;
    expect(t.states).toEqual(['starting', 'recording']);
    t.core.stop();
    expect(t.opened[0]?.track.stopped).toBe(true);
    expect(t.blobs).toHaveLength(1);
    expect(t.states.at(-1)).toBe('idle');
  });

  it('ignores a second start while the first is pending, so only one stream opens', async () => {
    const t = setup();
    void t.core.start();
    void t.core.start();
    await t.answer();
    expect(t.opened).toHaveLength(1);
    t.core.stop();
    expect(t.opened.every((s) => s.track.stopped)).toBe(true);
  });

  it('stops the stream if the recorder cannot be made', async () => {
    const t = setup({ failMake: true });
    void t.core.start();
    await t.answer();
    expect(t.opened[0]?.track.stopped).toBe(true);
    expect(t.states.at(-1)).toBe('denied');
  });

  it('reports a refused microphone', async () => {
    const t = setup({ deny: true });
    void t.core.start();
    await t.answer();
    expect(t.states.at(-1)).toBe('denied');
  });

  it('releases a stream that arrives after leaving the screen', async () => {
    const t = setup();
    void t.core.start();
    t.core.dispose();
    await t.answer();
    expect(t.opened[0]?.track.stopped).toBe(true);
    expect(t.blobs).toHaveLength(0);
  });

  it('stops recording when leaving mid-recording', async () => {
    const t = setup();
    void t.core.start();
    await t.answer();
    t.core.dispose();
    expect(t.opened[0]?.track.stopped).toBe(true);
    expect(t.blobs).toHaveLength(0);
  });
});
