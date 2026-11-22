import { useEffect, useRef, useState } from 'react';
import { useGuide } from './context.ts';
import './guide.css';

/**
 * A first-visit card (the-guide.md §3.4, R11–R13; #411): what a place or station is for, in two
 * sentences, the first time the player opens it. It doesn't block anything: the player can use
 * the place with it showing, and their first action anywhere else closes it, as Got it does.
 * Subjects place it in their own halls (their words, their speaker); the platform remembers it.
 */
export function FirstVisit({
  id,
  title,
  text,
  speaker,
}: {
  /** Its id in `guide_seen`: cardId(…) from seen.ts. */
  id: string;
  title: string;
  text: string;
  /** Who says it, if anyone: the innkeeper, say. */
  speaker?: string;
}) {
  const guide = useGuide();
  const [closed, setClosed] = useState(false);
  const card = useRef<HTMLElement>(null);
  const showing = Boolean(guide && !guide.seen.has(id) && !closed);
  useEffect(() => {
    if (!showing || !guide) return;
    const close = (e: Event) => {
      if (e.target instanceof Node && card.current?.contains(e.target)) return;
      setClosed(true);
      guide.mark(id);
    };
    // Capture, so the first action closes the card even if it stops the click going further.
    document.addEventListener('click', close, true);
    return () => document.removeEventListener('click', close, true);
  }, [showing, guide, id]);
  if (!showing || !guide) return null;
  return (
    <section ref={card} className="first-visit" aria-label={`About ${title}`}>
      <p className="first-visit__title">{title}</p>
      <p className="first-visit__text">{text}</p>
      {speaker && <p className="first-visit__who">— {speaker}</p>}
      <button
        type="button"
        className="first-visit__done"
        onClick={() => {
          setClosed(true);
          guide.mark(id);
        }}
      >
        Got it
      </button>
    </section>
  );
}
