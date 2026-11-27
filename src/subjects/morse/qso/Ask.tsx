import { useEffect, useRef, useState } from 'react';
import type { FinaleQuestion } from './fortyWinters.ts';
import './qso.css';

/** Three questions with their choices, one answer each (Forty Winters and the Long Copy). */
export function Ask({
  message,
  choices,
  onDone,
  onPick,
}: {
  message: { questions: readonly FinaleQuestion[] };
  choices: string[][];
  onDone: (answers: string[]) => void;
  /** The first answer was picked. */
  onPick?: () => void;
}) {
  // Focus moves to the questions when they appear, so a screen reader announces them.
  const heading = useRef<HTMLParagraphElement>(null);
  useEffect(() => heading.current?.focus(), []);
  const [answers, setAnswers] = useState<string[]>([]);
  const filled = message.questions.every((_, i) => answers[i]);
  return (
    <form
      className="lesson__card qso__card"
      onSubmit={(e) => {
        e.preventDefault();
        if (filled) onDone(answers);
      }}
    >
      <p className="lesson__kicker" ref={heading} tabIndex={-1}>
        What did it say?
      </p>
      {message.questions.map((q, i) => (
        <fieldset key={q.ask} className="qso__choices">
          <legend>{q.ask}</legend>
          {(choices[i] ?? []).map((c) => (
            <label key={c} className={answers[i] === c ? 'is-picked' : ''}>
              <input
                type="radio"
                name={`q${i}`}
                value={c}
                checked={answers[i] === c}
                onChange={() => {
                  onPick?.();
                  setAnswers((a) => {
                    const next = [...a];
                    next[i] = c;
                    return next;
                  });
                }}
              />
              {c}
            </label>
          ))}
        </fieldset>
      ))}
      <div className="lesson__actions">
        <button type="submit" className="lesson__go" disabled={!filled}>
          Answer it
        </button>
      </div>
    </form>
  );
}
