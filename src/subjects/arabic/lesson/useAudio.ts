import { useCallback, useRef } from 'react';
import { MEDIA_LINK_SECONDS } from '../../../core/content/privateContent.ts';
import type { SubjectApi } from '../../../core/subject.ts';

/** A cached link is fetched again a minute before it would expire. */
const REUSE_MS = (MEDIA_LINK_SECONDS - 60) * 1000;

/** Keeps signed links per path, renewing them before they expire (security review L1). */
export function linkCache(fetch: (path: string) => Promise<string>, now = () => Date.now()) {
  const links = new Map<string, { url: Promise<string>; at: number }>();
  return (path: string): Promise<string> => {
    const hit = links.get(path);
    if (hit && now() - hit.at < REUSE_MS) return hit.url;
    const url = fetch(path);
    url.catch(() => links.delete(path));
    links.set(path, { url, at: now() });
    return url;
  };
}

/** Plays the deck's recordings by path: one at a time, links fetched once and renewed. */
export function useAudio(api: SubjectApi) {
  const link = useRef<((path: string) => Promise<string>) | null>(null);
  const playing = useRef<HTMLAudioElement | null>(null);
  return useCallback(
    async (path: string) => {
      link.current ??= linkCache((p) => api.mediaUrl(p));
      try {
        const audio = new Audio(await link.current(path));
        playing.current?.pause();
        playing.current = audio;
        await audio.play();
      } catch {
        // No sound (offline, or the browser refused): the word is still on screen.
      }
    },
    [api],
  );
}
