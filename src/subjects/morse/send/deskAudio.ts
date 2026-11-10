import { useCallback, useEffect, useRef } from 'react';
import { newAudioContext } from '../../../core/audio.ts';
import { MorsePlayer } from '../player.ts';
import { Sidetone } from './sidetone.ts';

export interface Audio {
  ctx: AudioContext;
  tone: Sidetone;
  player: MorsePlayer;
}

/**
 * The desk's sound, made on first use (browsers allow it only after a tap or key press): the
 * sidetone you key with and a player for what you hear. Closed when the screen goes.
 */
export function useDeskAudio(): () => Audio | null {
  const audioRef = useRef<Audio | null>(null);
  const audio = useCallback((): Audio | null => {
    if (!audioRef.current && typeof AudioContext !== 'undefined') {
      const ctx = newAudioContext({ latencyHint: 'interactive' });
      audioRef.current = {
        ctx,
        tone: new Sidetone(ctx),
        player: new MorsePlayer({ context: ctx }),
      };
    }
    return audioRef.current;
  }, []);
  useEffect(
    () => () => {
      const a = audioRef.current;
      audioRef.current = null;
      a?.tone.close();
      a?.player.stop();
      void a?.ctx.close();
    },
    [],
  );
  return audio;
}
