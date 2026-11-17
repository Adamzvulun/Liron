// Which guilds' roads moved on since the player last stood in the square (task 4.6): their
// buildings light up when the player comes back. Remembered for the page, not saved.
import type { CompassLine } from './compass.ts';

/** Each guild's "Step N of M" the last time the square showed it. */
export function stepWatcher() {
  const seen = new Map<string, string>();
  /** The guilds whose step moved since the last look; the first look moves nothing. */
  return (lines: readonly CompassLine[]): string[] => {
    const moved: string[] = [];
    for (const l of lines) {
      if (!l.progress) continue;
      const before = seen.get(l.subject);
      if (before !== undefined && before !== l.progress) moved.push(l.subject);
      seen.set(l.subject, l.progress);
    }
    return moved;
  };
}
