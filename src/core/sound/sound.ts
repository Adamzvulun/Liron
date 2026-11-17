// The city's own sounds (task 4.6, docs/design/sound.md): a click when you press something, chimes
// for rewards, and a quiet bed of sound in each place. This part loads with the square and is
// small: the switches, and the rule that nothing plays before the player's first tap. The
// synthesizer itself (citySound.ts) loads when a sound is first wanted after that tap.
//
// The halls are left out on purpose: their sounds are the lessons, and a click over a Morse
// character would get in the way of hearing it.

import { useSyncExternalStore } from 'react';

export type Cue = 'tap' | 'reward' | 'levelUp' | 'step';
/** The places with a bed of sound; the halls have none. */
export type Ambient = 'square' | 'house' | 'market' | 'board';

export interface SoundSettings {
  /** Clicks and chimes. */
  effects: boolean;
  /** The quiet bed of sound in each place. */
  ambient: boolean;
}

export const DEFAULT_SOUND: SoundSettings = { effects: true, ambient: false };
const KEY = 'waymark:sound';

function read(): SoundSettings {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? 'null') as Partial<SoundSettings> | null;
    return {
      effects: typeof raw?.effects === 'boolean' ? raw.effects : DEFAULT_SOUND.effects,
      ambient: typeof raw?.ambient === 'boolean' ? raw.ambient : DEFAULT_SOUND.ambient,
    };
  } catch {
    return DEFAULT_SOUND;
  }
}

let settings = read();
const listeners = new Set<() => void>();

export const soundSettings = () => settings;

/** Changes a switch, on this device; it stays across reloads. */
export function setSound(change: Partial<SoundSettings>) {
  settings = { ...settings, ...change };
  try {
    localStorage.setItem(KEY, JSON.stringify(settings));
  } catch {
    // Private browsing: the choice holds until the page closes.
  }
  for (const l of listeners) l();
  follow();
}

export function useSoundSettings(): SoundSettings {
  return useSyncExternalStore((l) => {
    listeners.add(l);
    return () => listeners.delete(l);
  }, soundSettings);
}

type Synth = typeof import('./citySound.ts');
let synth: Promise<Synth> | null = null;
let place: Ambient | null = null;
/** Has the player tapped or pressed a key on this page? Nothing plays before. */
let tapped = false;

/** Starts the synthesizer the first time a sound is wanted, after the first tap. */
function wake(): Promise<Synth> {
  synth ??= import('./citySound.ts').then((s) => {
    s.start();
    s.apply(settings, place);
    return s;
  });
  return synth;
}

/** Starts, swaps or stops the bed of sound to match the switches and the place. */
function follow() {
  if (synth) void synth.then((s) => s.apply(settings, place));
  else if (tapped && settings.ambient && place) void wake();
}

/** True once a sound has been wanted on this page (and the synthesizer made). */
export const awake = () => synth !== null;

/** Plays a cue, if sounds are on and the player has tapped since the page opened. */
export function cue(kind: Cue) {
  if (!settings.effects || !tapped) return;
  void wake().then((s) => s.cue(kind));
}

/** The bed of sound for where the player is now (null for none). */
export function setAmbient(next: Ambient | null) {
  place = next;
  follow();
}

/** What a press on this element sounds like: a click, unless it's in a hall or not pressable. */
export function pressSound(target: EventTarget | null): Cue | null {
  const el = target as Partial<Element> | null;
  if (typeof el?.closest !== 'function') return null;
  const pressed = el.closest(
    'button, a[href], [role="button"], summary, input[type="checkbox"], input[type="radio"]',
  );
  if (!pressed || pressed.closest('[data-sound="quiet"]')) return null;
  if ((pressed as Partial<HTMLButtonElement>).disabled === true) return null;
  return 'tap';
}

/**
 * Listens for the player's taps and key presses: the first one allows sound on this page, and
 * each press of a button or link in the city clicks. The synthesizer is made only when a sound
 * is wanted, so a tap inside a hall makes none. Returns a function that stops listening.
 */
export function armSound(doc: Document = document): () => void {
  const first = () => {
    tapped = true;
    follow();
  };
  const press = (e: Event) => {
    tapped = true;
    const kind = pressSound(e.target);
    if (kind) cue(kind);
  };
  doc.addEventListener('pointerdown', first, true);
  doc.addEventListener('keydown', first, true);
  doc.addEventListener('click', press, true);
  return () => {
    doc.removeEventListener('pointerdown', first, true);
    doc.removeEventListener('keydown', first, true);
    doc.removeEventListener('click', press, true);
  };
}

/** For tests: back to a fresh page. */
export function resetSoundForTests() {
  settings = read();
  synth = null;
  place = null;
  tapped = false;
}
