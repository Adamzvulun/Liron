import { useLayoutEffect, useRef, useState } from 'react';
import { STAGE, stageFit } from './layout.ts';

/** On a phone held upright the scene fills the height and pans sideways (#27). */
const panning = (el: HTMLElement) => el.clientWidth < 900 && el.clientHeight > el.clientWidth;

/**
 * Scale and position for a painted 1920×1080 stage (the city, the Signal Tower) inside the
 * element the returned ref is put on. Wide windows are filled (`stageFit`); upright phones fill
 * the height and scroll sideways, starting with `startX` (a stage x) in the middle. `fit` can
 * replace the city's rule for wide windows.
 */
export function useStage(startX: number, fit: typeof stageFit = stageFit) {
  const ref = useRef<HTMLDivElement>(null);
  const [view, setView] = useState({ scale: 1, x: 0, y: 0, pan: false });
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const resize = () => {
      const pan = panning(el);
      setView(
        pan
          ? { scale: el.clientHeight / STAGE.height, x: 0, y: 0, pan }
          : { ...fit(el.clientWidth, el.clientHeight), pan },
      );
    };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(el);
    return () => observer.disconnect();
  }, [fit]);
  // Keep the same spot in the middle when the scale changes (the HUD loading above shrinks the
  // view); start at `startX`.
  const centre = useRef(startX);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || !view.pan) return;
    el.scrollLeft = centre.current * view.scale - el.clientWidth / 2;
    const remember = () => {
      centre.current = (el.scrollLeft + el.clientWidth / 2) / view.scale;
    };
    el.addEventListener('scroll', remember, { passive: true });
    return () => el.removeEventListener('scroll', remember);
  }, [view.pan, view.scale]);
  return [ref, view] as const;
}
