import { useEffect, useRef, type ReactNode } from 'react';
import { Link } from '../Link.tsx';
import type { SubjectInfo } from '../subject.ts';
import { PLACE_SOON, PLAQUES } from './layout.ts';
import type { PlaceId } from './painter.js';

/**
 * A place's screen. Until halls and houses get their own content (E5, E6, E8, E10), it says
 * what will be there. Focus moves to the title, so screen readers announce the new screen.
 */
export function PlaceScreen({
  place,
  resident,
  children,
  wide,
}: {
  place: PlaceId;
  resident?: SubjectInfo;
  /** What the place already offers, shown instead of the "coming" note. */
  children?: ReactNode;
  /** Room for a two-column screen, like the wardrobe in Your House. */
  wide?: boolean;
}) {
  const title = useRef<HTMLHeadingElement>(null);
  useEffect(() => title.current?.focus(), [place]);
  return (
    <main
      className={`place-screen${wide ? ' place-screen--wide' : ''}`}
      style={{ borderTopColor: resident?.guildColor }}
    >
      <Link className="place-screen__back" href="/">
        ← Back to the square
      </Link>
      <h1 className="place-screen__title" tabIndex={-1} ref={title}>
        {resident?.place ?? PLAQUES[place].title}
      </h1>
      {resident && <p className="place-screen__tagline">{resident.tagline}</p>}
      {children ?? <p className="place-screen__soon">{PLACE_SOON[place]}</p>}
    </main>
  );
}
