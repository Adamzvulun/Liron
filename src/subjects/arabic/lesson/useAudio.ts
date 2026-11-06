import { useCallback, useLayoutEffect, useRef } from 'react';
import { MEDIA_LINK_SECONDS } from '../../../core/content/privateContent.ts';
import type { SubjectApi } from '../../../core/subject.ts';

/** A cached link is fetched again a minute before it would expire. */
const REUSE_MS = (MEDIA_LINK_SECONDS - 60) * 1000;

/** At most this many links are asked for in one request. */
const BATCH = 100;

/**
 * Keeps signed links per path, renewing them before they expire (security review L1).
 * `prepare` asks for many at once (#124), so a session's recordings each play without a
 * request of their own first.
 */
export function linkCache(
  fetch: (path: string) => Promise<string>,
  now = () => Date.now(),
  fetchMany?: (paths: readonly string[]) => Promise<Map<string, string>>,
) {
  const links = new Map<string, { url: Promise<string>; at: number }>();
  const fresh = (path: string) => {
    const hit = links.get(path);
    return hit && now() - hit.at < REUSE_MS ? hit : null;
  };
  const one = (path: string): Promise<string> => {
    const hit = fresh(path);
    if (hit) return hit.url;
    const url = fetch(path);
    url.catch(() => links.delete(path));
    links.set(path, { url, at: now() });
    return url;
  };
  one.prepare = (paths: readonly string[]) => {
    const wanted = [...new Set(paths)].filter((p) => !fresh(p));
    if (!fetchMany) return;
    for (let i = 0; i < wanted.length; i += BATCH) {
      const batch = wanted.slice(i, i + BATCH);
      const at = now();
      const many = fetchMany(batch);
      for (const path of batch) {
        // A path the batch didn't sign is asked for on its own.
        const url = many.then((m) => m.get(path) ?? fetch(path));
        url.catch(() => links.delete(path));
        links.set(path, { url, at });
      }
    }
  };
  return one;
}

/**
 * Plays the deck's recordings by path: one at a time, links fetched once and renewed.
 * `upcoming` (a session's recordings) are signed together as soon as they're known.
 */
export function useAudio(api: SubjectApi, upcoming: readonly string[] = []) {
  const link = useRef<ReturnType<typeof linkCache> | null>(null);
  const playing = useRef<HTMLAudioElement | null>(null);
  const links = useCallback(() => {
    link.current ??= linkCache(
      (p) => api.mediaUrl(p),
      undefined,
      (ps) => api.mediaUrls(ps),
    );
    return link.current;
  }, [api]);
  const key = upcoming.join('\n');
  // A layout effect runs before any child's effect, so a question that plays as it opens finds
  // its link already asked for.
  useLayoutEffect(() => {
    if (key) links().prepare(key.split('\n'));
  }, [key, links]);
  return useCallback(
    async (path: string) => {
      try {
        const audio = new Audio(await links()(path));
        playing.current?.pause();
        playing.current = audio;
        await audio.play();
      } catch {
        // No sound (offline, or the browser refused): the word is still on screen.
      }
    },
    [links],
  );
}
