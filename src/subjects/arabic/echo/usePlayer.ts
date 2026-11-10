import { useCallback, useEffect, useLayoutEffect, useRef } from 'react';
import type { SubjectApi } from '../../../core/subject.ts';
import { linkCache } from '../lesson/useAudio.ts';

/** How far to the right your own voice sits when you hear both together. */
export const MINE_PAN = 0.6;

/** Resolves once the element has played to the end (or was stopped, or failed). */
function whenDone(audio: HTMLAudioElement): Promise<void> {
  return new Promise((resolve) => {
    const done = () => resolve();
    audio.addEventListener('ended', done, { once: true });
    audio.addEventListener('pause', done, { once: true });
    audio.addEventListener('error', done, { once: true });
  });
}

/**
 * Shadowing's player (#194): the speaker at a chosen speed (the browser keeps the pitch), your
 * recording, or both at once with yours a little to the right. Each play stops the last one and
 * says when it has finished, so a recording can start and stop with the speaker.
 */
export function usePlayer(api: SubjectApi, upcoming: readonly string[] = []) {
  const link = useRef<ReturnType<typeof linkCache> | null>(null);
  const playing = useRef<HTMLAudioElement[]>([]);
  const ctx = useRef<AudioContext | null>(null);
  const links = useCallback(() => {
    link.current ??= linkCache(
      (p) => api.mediaUrl(p),
      undefined,
      (ps) => api.mediaUrls(ps),
    );
    return link.current;
  }, [api]);
  const key = upcoming.join('\n');
  useLayoutEffect(() => {
    if (key) links().prepare(key.split('\n'));
  }, [key, links]);

  const stop = useCallback(() => {
    for (const a of playing.current) a.pause();
    playing.current = [];
  }, []);
  useEffect(
    () => () => {
      for (const a of playing.current) a.pause();
      playing.current = [];
      void ctx.current?.close();
      ctx.current = null;
    },
    [],
  );

  const start = useCallback(async (audios: HTMLAudioElement[]) => {
    playing.current = audios;
    const done = Promise.all(audios.map(whenDone));
    try {
      await Promise.all(audios.map((a) => a.play()));
    } catch {
      // No sound (the browser refused): the sentence is still on screen.
      for (const a of audios) a.pause();
    }
    await done;
  }, []);

  const speaker = useCallback(
    async (path: string, rate: number) => {
      const audio = new Audio(await links()(path));
      audio.playbackRate = rate;
      audio.preservesPitch = true;
      return audio;
    },
    [links],
  );

  /** The speaker at `rate`; resolves when it ends. */
  const play = useCallback(
    async (path: string, rate = 1) => {
      stop();
      try {
        await start([await speaker(path, rate)]);
      } catch {
        // No link (offline): nothing to play.
      }
    },
    [speaker, start, stop],
  );

  /** Your recording (a blob URL in this tab). */
  const playMine = useCallback(
    async (url: string) => {
      stop();
      await start([new Audio(url)]);
    },
    [start, stop],
  );

  /** Both at once: the speaker in the middle, you a little to the right. */
  const together = useCallback(
    async (path: string, rate: number, url: string) => {
      stop();
      let theirs: HTMLAudioElement;
      try {
        theirs = await speaker(path, rate);
      } catch {
        return;
      }
      const mine = new Audio(url);
      try {
        // Our own recording is same-origin, so it can go through a panner.
        ctx.current ??= new AudioContext();
        const pan = new StereoPannerNode(ctx.current, { pan: MINE_PAN });
        ctx.current.createMediaElementSource(mine).connect(pan).connect(ctx.current.destination);
        if (ctx.current.state === 'suspended') await ctx.current.resume();
      } catch {
        // No Web Audio: both still play, side by side in the middle.
      }
      await start([theirs, mine]);
    },
    [speaker, start, stop],
  );

  return { play, playMine, together, stop };
}
