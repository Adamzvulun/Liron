import { useCallback, useEffect, useRef, useState } from 'react';

export type RecorderState = 'idle' | 'starting' | 'recording' | 'denied' | 'unsupported';

interface Media {
  getUserMedia(c: { audio: true }): Promise<MediaStream>;
}
type MakeRecorder = (stream: MediaStream) => MediaRecorder;

/**
 * The microphone side of "Say it", without React, so it can be tested with fakes. It holds at
 * most one stream, ignores a second start while the first is pending, and stops every track it
 * ever opened on failure, on stop and on dispose (security review M4).
 */
export class RecorderCore {
  private stream: MediaStream | null = null;
  private rec: MediaRecorder | null = null;
  private busy = false;
  private disposed = false;

  constructor(
    private readonly media: Media,
    private readonly make: MakeRecorder,
    private readonly onState: (s: RecorderState) => void,
    private readonly onRecording: (blob: Blob) => void,
  ) {}

  async start(): Promise<void> {
    if (this.busy || this.disposed) return;
    this.busy = true;
    this.onState('starting');
    let stream: MediaStream | null = null;
    try {
      stream = await this.media.getUserMedia({ audio: true });
      if (this.disposed) {
        release(stream);
        return;
      }
      const rec = this.make(stream);
      const chunks: Blob[] = [];
      rec.ondataavailable = (e) => chunks.push(e.data);
      rec.onstop = () => {
        this.release();
        if (this.disposed) return;
        this.onRecording(new Blob(chunks, { type: rec.mimeType }));
        this.onState('idle');
      };
      this.stream = stream;
      this.rec = rec;
      rec.start();
      this.onState('recording');
    } catch {
      if (stream) release(stream);
      this.release();
      if (!this.disposed) this.onState('denied');
    }
  }

  stop(): void {
    if (this.rec && this.rec.state !== 'inactive') this.rec.stop();
    else this.release();
  }

  dispose(): void {
    this.disposed = true;
    if (this.rec && this.rec.state !== 'inactive') this.rec.stop();
    this.release();
  }

  private release() {
    if (this.stream) release(this.stream);
    this.stream = null;
    this.rec = null;
    this.busy = false;
  }
}

const release = (stream: MediaStream) => stream.getTracks().forEach((t) => t.stop());

/**
 * Record yourself to compare with the native speaker (#45, ADR 0013): the recording stays in
 * this browser tab as a blob URL. Nothing is uploaded, and the microphone is released as soon
 * as you stop or leave.
 */
export function useRecorder() {
  const supported =
    typeof navigator !== 'undefined' &&
    !!navigator.mediaDevices?.getUserMedia &&
    typeof MediaRecorder !== 'undefined';
  const [state, setState] = useState<RecorderState>(supported ? 'idle' : 'unsupported');
  const [url, setUrl] = useState<string | null>(null);
  const core = useRef<RecorderCore | null>(null);

  useEffect(
    () => () => {
      if (url) URL.revokeObjectURL(url);
    },
    [url],
  );
  useEffect(() => {
    if (!supported) return;
    const c = new RecorderCore(
      navigator.mediaDevices,
      (s) => new MediaRecorder(s),
      setState,
      (blob) => setUrl(URL.createObjectURL(blob)),
    );
    core.current = c;
    return () => {
      c.dispose();
      core.current = null;
    };
  }, [supported]);

  const start = useCallback(async () => core.current?.start(), []);
  const stop = useCallback(() => core.current?.stop(), []);
  const reset = useCallback(() => setUrl(null), []);

  return { state, url, start, stop, reset };
}
