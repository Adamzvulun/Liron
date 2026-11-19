import { useEffect, useRef, useState } from 'react';

const reducedMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/**
 * A number that counts up to `value` over `ms` when it grows (coins pouring in), and jumps
 * when it shrinks, on first show, or when the system asks for reduced motion.
 */
export function useCountUp(value: number | undefined, ms = 700): number | undefined {
  const [shown, setShown] = useState(value);
  const from = useRef(value);
  // The number on screen: a second rise mid-count starts from it, not from the first target,
  // so the purse doesn't jump (review, 2026-11-19).
  const onScreen = useRef(value);
  useEffect(() => {
    const before = from.current;
    from.current = value;
    const show = (n: number | undefined) => {
      onScreen.current = n;
      setShown(n);
    };
    const start = onScreen.current;
    if (
      value === undefined ||
      before === undefined ||
      start === undefined ||
      value <= before ||
      reducedMotion()
    ) {
      show(value);
      return;
    }
    const t0 = performance.now();
    let frame = requestAnimationFrame(function step(now) {
      const t = Math.min(1, (now - t0) / ms);
      const eased = 1 - (1 - t) ** 3;
      show(Math.round(start + (value - start) * eased));
      if (t < 1) frame = requestAnimationFrame(step);
    });
    return () => cancelAnimationFrame(frame);
  }, [value, ms]);
  return shown;
}
