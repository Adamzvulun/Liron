// Navigation without a library (issue #25, ADR 0026): the browser's history API, and a hook
// that re-renders when the path changes. Waymark has a handful of fixed screens.
import { useSyncExternalStore } from 'react';

const NAVIGATE = 'wm:navigate';

function subscribe(onChange: () => void) {
  window.addEventListener('popstate', onChange);
  window.addEventListener(NAVIGATE, onChange);
  return () => {
    window.removeEventListener('popstate', onChange);
    window.removeEventListener(NAVIGATE, onChange);
  };
}

/** The current path, e.g. "/" or "/signal-tower". */
export function usePath(): string {
  return useSyncExternalStore(subscribe, () => window.location.pathname);
}

/** Goes to `to` as a new history entry, so the back button returns. */
export function navigate(to: string) {
  if (to === window.location.pathname) return;
  window.history.pushState(null, '', to);
  window.dispatchEvent(new Event(NAVIGATE));
}
