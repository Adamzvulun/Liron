import { useCallback, useEffect, useRef, useState } from 'react';

export type RecorderState = 'idle' | 'recording' | 'denied' | 'unsupported';

/**
 * Record yourself to compare with the native speaker (#45, ADR 0013): the recording stays in
 * this browser tab as a blob URL. Nothing is uploaded, and the microphone is released as soon
 * as you stop.
 */
export function useRecorder() {
  const supported =
    typeof navigator !== 'undefined' &&
    !!navigator.mediaDevices?.getUserMedia &&
    typeof MediaRecorder !== 'undefined';
  const [state, setState] = useState<RecorderState>(supported ? 'idle' : 'unsupported');
  const [url, setUrl] = useState<string | null>(null);
  const recorder = useRef<MediaRecorder | null>(null);

  useEffect(
    () => () => {
      if (url) URL.revokeObjectURL(url);
    },
    [url],
  );
  useEffect(() => () => recorder.current?.stream.getTracks().forEach((t) => t.stop()), []);

  const start = useCallback(async () => {
    if (!supported) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const rec = new MediaRecorder(stream);
      const chunks: Blob[] = [];
      rec.ondataavailable = (e) => chunks.push(e.data);
      rec.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        setUrl(URL.createObjectURL(new Blob(chunks, { type: rec.mimeType })));
        setState('idle');
      };
      recorder.current = rec;
      rec.start();
      setState('recording');
    } catch {
      setState('denied');
    }
  }, [supported]);

  const stop = useCallback(() => recorder.current?.stop(), []);
  const reset = useCallback(() => setUrl(null), []);

  return { state, url, start, stop, reset };
}
