// The road inside a hall (docs/game/the-road.md §6): where you stand, the one thing to do now,
// and "the road so far", where the tale can be read again. The hall's subject hands over its own
// steps and checks; this only shows them.
import { useId, useState, type ReactNode } from 'react';
import { useDialogFocus } from '../player/useDialogFocus.ts';
import { HALL_DOOR, standingLine, type RoadAnswer, type RoadStep } from './road.ts';
import './road.css';

export interface RoadLineProps {
  answer: RoadAnswer;
  steps: readonly RoadStep[];
  done: (step: RoadStep) => boolean;
  /** Opens a door of the hall. Not called for the hall itself. */
  onOpen: (door: string) => void;
  /** Shows a beat; a subject with its own script marks it up here. */
  text?: (words: string) => ReactNode;
}

/** How many steps ahead "the road so far" names. */
const AHEAD = 3;

export function RoadLine({ answer, steps, done, onOpen, text = (w) => w }: RoadLineProps) {
  const [open, setOpen] = useState(false);
  const { now } = answer;
  const door = now.kind === 'step' ? now.step.door : now.door;
  const words = now.kind === 'step' ? now.step.invite : now.line;
  return (
    <div className="road">
      <button type="button" className="road__count" onClick={() => setOpen(true)}>
        {standingLine(answer)} <span className="road__sofar">· the road so far</span>
      </button>
      {answer.waiting && <p className="road__wait">{answer.waiting.line}</p>}
      {door === HALL_DOOR ? (
        <p className="road__next">
          <strong>Next:</strong> {words}
        </p>
      ) : (
        <button type="button" className="road__next" onClick={() => onOpen(door)}>
          <strong>Next:</strong> {words}
        </button>
      )}
      {open && (
        <RoadSoFar
          answer={answer}
          steps={steps}
          done={done}
          text={text}
          onClose={() => setOpen(false)}
        />
      )}
    </div>
  );
}

function RoadSoFar({
  answer,
  steps,
  done,
  text,
  onClose,
}: Required<Pick<RoadLineProps, 'answer' | 'steps' | 'done' | 'text'>> & { onClose: () => void }) {
  const close = useDialogFocus();
  const titleId = useId();
  const walked = steps.filter(done).reverse();
  const ahead = steps.filter((s) => !done(s));
  const more = ahead.length - AHEAD;
  const chapters = [...new Set(steps.map((x) => x.chapter))];
  return (
    <div
      className="road__veil"
      role="presentation"
      onKeyDown={(e) => e.key === 'Escape' && onClose()}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="road__book" role="dialog" aria-modal="true" aria-labelledby={titleId}>
        <div className="road__head">
          <h2 id={titleId} className="road__title">
            {answer.questline}: the road so far
          </h2>
          <button ref={close} type="button" className="road__close" onClick={onClose}>
            Close
          </button>
        </div>
        <p className="road__tally">
          {walked.length} of {steps.length} steps walked
          {answer.position && (
            <>
              {' '}
              · chapter {chapters.indexOf(answer.position.chapter.number) + 1} of {chapters.length}:{' '}
              {answer.position.chapter.title}
            </>
          )}
        </p>
        {ahead.length > 0 && (
          <>
            <h3 className="road__part">Ahead</h3>
            <ol className="road__ahead">
              {ahead.slice(0, AHEAD).map((s) => (
                <li key={s.id}>{s.title}</li>
              ))}
            </ol>
            {more > 0 && <p className="road__more">and {more} more</p>}
          </>
        )}
        <h3 className="road__part">Walked</h3>
        {walked.length === 0 ? (
          <p className="road__more">Nothing yet. The first step is waiting.</p>
        ) : (
          <ol className="road__walked" reversed>
            {walked.map((s) => (
              <li key={s.id}>
                <span className="road__step">{s.title}</span>
                {s.beat && <span className="road__beat">{text(s.beat)}</span>}
              </li>
            ))}
          </ol>
        )}
      </div>
    </div>
  );
}
