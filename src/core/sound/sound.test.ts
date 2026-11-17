import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// The city's sound switches and the first-tap rule (task 4.6, docs/design/sound.md).

const stored = new Map<string, string>();
const storage = {
  getItem: (k: string) => stored.get(k) ?? null,
  setItem: (k: string, v: string) => void stored.set(k, v),
};

/** A document that records its listeners, so a test can tap it. */
function fakeDocument() {
  const on = new Map<string, ((e: Event) => void)[]>();
  return {
    doc: {
      addEventListener: (type: string, f: (e: Event) => void) =>
        on.set(type, [...(on.get(type) ?? []), f]),
      removeEventListener: (type: string, f: (e: Event) => void) =>
        on.set(
          type,
          (on.get(type) ?? []).filter((g) => g !== f),
        ),
    } as unknown as Document,
    fire: (type: string, target: unknown = null) => {
      for (const f of on.get(type) ?? []) f({ target } as unknown as Event);
    },
    count: () => [...on.values()].flat().length,
  };
}

/** An element whose `closest` answers from a list of what it is inside. */
const element = (inside: string[], extra: object = {}): EventTarget =>
  ({
    closest: (sel: string) =>
      inside.some((i) => sel.includes(i)) ? element(inside.slice(1), extra) : null,
    ...extra,
  }) as unknown as EventTarget;

const synth = { start: vi.fn(), apply: vi.fn(), cue: vi.fn() };
vi.mock('./citySound.ts', () => synth);

async function load() {
  vi.resetModules();
  return import('./sound.ts');
}

beforeEach(() => {
  stored.clear();
  vi.stubGlobal('localStorage', storage);
  synth.start.mockClear();
  synth.apply.mockClear();
  synth.cue.mockClear();
});
afterEach(() => vi.unstubAllGlobals());

const settle = () => new Promise((r) => setTimeout(r, 0));

describe('the switches', () => {
  it('start with clicks on and the places quiet, and stay as set across reloads', async () => {
    let s = await load();
    expect(s.soundSettings()).toEqual({ effects: true, ambient: false });
    s.setSound({ effects: false, ambient: true });
    s = await load();
    expect(s.soundSettings()).toEqual({ effects: false, ambient: true });
  });

  it('fall back to the defaults when storage is broken or refused', async () => {
    stored.set('waymark:sound', '{oops');
    expect((await load()).soundSettings()).toEqual({ effects: true, ambient: false });
    vi.stubGlobal('localStorage', {
      getItem: () => {
        throw new Error('private');
      },
      setItem: () => {
        throw new Error('private');
      },
    });
    const s = await load();
    expect(s.soundSettings()).toEqual({ effects: true, ambient: false });
    s.setSound({ effects: false });
    expect(s.soundSettings().effects).toBe(false);
  });
});

describe('the first tap', () => {
  it('nothing plays and nothing loads before it', async () => {
    const s = await load();
    s.cue('reward');
    s.setAmbient('square');
    await settle();
    expect(s.awake()).toBe(false);
    expect(synth.start).not.toHaveBeenCalled();
    expect(synth.cue).not.toHaveBeenCalled();
  });

  it('wakes the synthesizer, which then plays cues and the place', async () => {
    const s = await load();
    s.setSound({ ambient: true });
    s.setAmbient('square');
    const d = fakeDocument();
    s.armSound(d.doc);
    d.fire('pointerdown');
    await settle();
    expect(synth.start).toHaveBeenCalledOnce();
    expect(synth.apply).toHaveBeenLastCalledWith({ effects: true, ambient: true }, 'square');
    d.fire('click', element(['button']));
    s.cue('levelUp');
    await settle();
    expect(synth.cue.mock.calls).toEqual([['tap'], ['levelUp']]);
  });

  it('with every switch off, a tap wakes nothing', async () => {
    const s = await load();
    s.setSound({ effects: false, ambient: false });
    const d = fakeDocument();
    s.armSound(d.doc);
    d.fire('pointerdown');
    d.fire('click', element(['button']));
    await settle();
    expect(s.awake()).toBe(false);
  });

  it('off is respected after waking', async () => {
    const s = await load();
    const d = fakeDocument();
    s.armSound(d.doc);
    d.fire('keydown');
    s.setSound({ effects: false });
    d.fire('click', element(['button']));
    s.cue('reward');
    await settle();
    expect(synth.cue).not.toHaveBeenCalled();
  });

  it('stops listening when disarmed', async () => {
    const s = await load();
    const d = fakeDocument();
    const stop = s.armSound(d.doc);
    expect(d.count()).toBe(3);
    stop();
    expect(d.count()).toBe(0);
  });
});

describe('which presses click', () => {
  it('buttons, links and switches; not in a hall, not disabled, not plain text', async () => {
    const { pressSound } = await load();
    expect(pressSound(element(['button']))).toBe('tap');
    expect(pressSound(element(['a[href]']))).toBe('tap');
    expect(pressSound(element(['input[type="checkbox"]']))).toBe('tap');
    expect(pressSound(element(['button', 'data-sound="quiet"']))).toBeNull();
    expect(pressSound(element(['button'], { disabled: true }))).toBeNull();
    expect(pressSound(element([]))).toBeNull();
    expect(pressSound(null)).toBeNull();
  });
});

describe('a tap that wants no sound', () => {
  it('makes no synthesizer: a press in a hall, with the places quiet', async () => {
    const s = await load();
    const d = fakeDocument();
    s.armSound(d.doc);
    d.fire('pointerdown');
    d.fire('click', element(['button', 'data-sound="quiet"']));
    await settle();
    expect(s.awake()).toBe(false);
    s.cue('reward');
    await settle();
    expect(synth.cue).toHaveBeenCalledWith('reward');
  });
});
