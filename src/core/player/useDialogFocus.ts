import { useEffect, useRef } from 'react';

/**
 * A dialog's focus: its main button takes focus when it opens, and focus goes back to where it
 * was when it closes, so a keyboard or screen-reader player isn't dropped at the top of the
 * page (review, 2026-11-15). Attach the returned ref to the button.
 */
export function useDialogFocus<T extends HTMLElement = HTMLButtonElement>() {
  const ref = useRef<T>(null);
  useEffect(() => {
    const before = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    ref.current?.focus();
    return () => {
      if (before?.isConnected) before.focus();
    };
  }, []);
  return ref;
}
