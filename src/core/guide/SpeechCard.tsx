import { useEffect, useState } from 'react';
import { Avatar } from '../avatar/Avatar.tsx';
import { NOUR, NOUR_LOOK } from './nour.ts';
import type { Point } from './words.ts';
import './guide.css';

export interface Line {
  text: string;
  /** What glows while the line shows. */
  point?: Point;
}

/**
 * Nour speaking (the-guide.md §3.2, #409): a card at the bottom of the square (under the HUD on a phone), never a dialog, so it traps no
 * focus and the square stays usable. While a line shows, the thing it names glows: the page's
 * root carries `data-guide-point`, and guide.css rings the matching part of the screen.
 */
export function SpeechCard({
  lines,
  next,
  done,
  skip,
  side = 'left',
  onDone,
}: {
  lines: readonly Line[];
  next: string;
  done: string;
  skip?: string;
  /** Which bottom corner on a wide screen (introductions.ts, cardSide); a phone ignores it. */
  side?: 'left' | 'right';
  /** Called once, when the last line is closed or the player skips. */
  onDone: () => void;
}) {
  const [at, setAt] = useState(0);
  const line = lines[at];
  const point = line?.point;
  useEffect(() => {
    const root = document.documentElement;
    if (point) root.dataset.guidePoint = point;
    else delete root.dataset.guidePoint;
    return () => {
      delete root.dataset.guidePoint;
    };
  }, [point]);
  if (!line) return null;
  const last = at === lines.length - 1;
  return (
    <section
      className={side === 'right' ? 'guide guide--right' : 'guide'}
      aria-label={`${NOUR}, the lamplighter`}
    >
      <Avatar look={NOUR_LOOK} view="portrait" className="guide__face" />
      <div className="guide__body">
        <p className="guide__name">{NOUR}</p>
        <p className="guide__text" role="status">
          {line.text}
        </p>
        <div className="guide__buttons">
          {skip && !last && (
            <button type="button" className="guide__skip" onClick={onDone}>
              {skip}
            </button>
          )}
          <button
            type="button"
            className="guide__next"
            onClick={() => (last ? onDone() : setAt(at + 1))}
          >
            {last ? done : next}
          </button>
        </div>
      </div>
    </section>
  );
}
