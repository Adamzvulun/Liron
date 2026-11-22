// The welcome (the-guide.md §3.2, #409): three lines from Nour, the first time a player is on the
// square after their first step. Loaded only when it is due, like the first page.
import { SpeechCard } from './SpeechCard.tsx';
import { WELCOME } from './words.ts';

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
