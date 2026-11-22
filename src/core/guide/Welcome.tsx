// The welcome (the-guide.md §3.2, #409): three lines from Nour, the first time a player is on the
// square after their first step. Loaded only when it is due, like the first page.
import { SpeechCard } from './SpeechCard.tsx';
import { FirstVisit } from './FirstVisit.tsx';
import { cardId } from './seen.ts';
import { INTRODUCTIONS, PLACE_CARDS, WELCOME } from './words.ts';

export function Welcome({ onDone }: { onDone: () => void }) {
  return (
    <SpeechCard
      lines={WELCOME.lines}
      next={WELCOME.next}
      done={WELCOME.done}
      skip={WELCOME.skip}
      onDone={onDone}
    />
  );
}

/**
 * One introduction (the-guide.md §3.3, #410): Nour's line about the place wearing the new mark.
 * Got it closes it for this visit; going into the place is what introduces it.
 */
export function Introduce({ id, onDone }: { id: string; onDone: () => void }) {
  const text = INTRODUCTIONS.lines[id];
  if (!text) return null;
  return (
    <SpeechCard
      key={id}
      lines={[{ text }]}
      next={INTRODUCTIONS.done}
      done={INTRODUCTIONS.done}
      onDone={onDone}
    />
  );
}

/** A platform place's first-visit card (the-guide.md §3.4, #411). */
export function PlaceCard({ place }: { place: keyof typeof PLACE_CARDS }) {
  const { title, text } = PLACE_CARDS[place];
  return <FirstVisit id={cardId(place)} title={title} text={text} />;
}
