import { useEffect, useRef } from 'react';

const FOCUSABLE =
  'button:not([disabled]), a[href], input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])';

/**
 * A dialog's focus: its main button takes focus when it opens, Tab and Shift+Tab stay inside
 * the dialog while it's open, and focus goes back to where it was when it closes, so a keyboard
 * or screen-reader player isn't dropped at the top of the page or behind the overlay (review,
 * 2026-11-15). Attach the returned ref to the button, inside the `role="dialog"` element.
 */
export function useDialogFocus<T extends HTMLElement = HTMLButtonElement>() {
  const ref = useRef<T>(null);
  useEffect(() => {
    const before = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    ref.current?.focus();
    const keepInside = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;
      const dialog = ref.current?.closest('[role="dialog"]');
      if (!dialog) return;
      const items = [...dialog.querySelectorAll<HTMLElement>(FOCUSABLE)];
      const first = items[0];
      const last = items.at(-1);
      if (!first || !last) return;
      const active = document.activeElement;
      const outside = !dialog.contains(active);
      if (e.shiftKey ? outside || active === first : outside || active === last) {
        e.preventDefault();
        (e.shiftKey ? last : first).focus();
      }
    };
    document.addEventListener('keydown', keepInside);
    return () => {
      document.removeEventListener('keydown', keepInside);
      if (before?.isConnected) before.focus();
    };
  }, []);
  return ref;
}
