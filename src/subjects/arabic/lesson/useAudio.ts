import { useCallback, useRef } from 'react';
import type { SubjectApi } from '../../../core/subject.ts';

/** Plays the deck's recordings by path: one at a time, links fetched once. */
export function useAudio(api: SubjectApi) {
  const urls = useRef(new Map<string, Promise<string>>());
  const playing = useRef<HTMLAudioElement | null>(null);
  return useCallback(
    async (path: string) => {
      let url = urls.current.get(path);
      if (!url) {
        url = api.mediaUrl(path);
        url.catch(() => urls.current.delete(path));
        urls.current.set(path, url);
      }
      try {
        const audio = new Audio(await url);
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
