import { useState } from 'react';
import type { SubjectApi } from '../../../core/subject.ts';
import type { ReviewGrade } from '../../../core/srs/scheduler.ts';
import type { ArabicProgress } from '../progress.ts';
import { lineInHebrew, type Glossary } from './innChat.ts';
import { Glosses } from './Glosses.tsx';

// The Coach's phrases (ADR 0007, 0038): the tips you kept come back when they're due. You see
// what you said and why it wasn't quite right, try to say it the Palestinian way, then check.

type Tip = ArabicProgress['chat']['tips'][number];

export function CoachPhrases({
  api,
  tips,
  glossary,
  onDone,
}: {
  api: SubjectApi;
  tips: readonly Tip[];
  /** Our glosses of the word path's deck words, shown under the better line. */
  glossary: Glossary;
  onDone: () => void;
}) {
  const [index, setIndex] = useState(0);
  const [open, setOpen] = useState(false);
  const [grades, setGrades] = useState<{ itemId: string; grade: ReviewGrade }[]>([]);
  const [saveFailed, setSaveFailed] = useState(false);
  const tip = tips[index];

  const grade = (g: ReviewGrade) => {
    if (!tip) return;
    const all = [...grades, { itemId: tip.id, grade: g }];
    setGrades(all);
    setOpen(false);
    setIndex(index + 1);
    if (index + 1 >= tips.length)
      api.saveSession({ reviews: all }).then(
        () => setSaveFailed(false),
        () => setSaveFailed(true),
      );
  };

  if (!tip)
    return (
      <div className="lesson__card lesson__start">
        <p className="lesson__kicker">The Coach’s phrases · done</p>
        {saveFailed && (
          <p className="lesson__warning" role="alert">
            Your practice couldn’t be saved. Check your connection and try again.
          </p>
        )}
        <p>
          {grades.filter((g) => g.grade === 'good').length} of {grades.length} said the Palestinian
          way. They’ll come back when it’s time.
        </p>
        <div className="lesson__actions">
          <button type="button" className="lesson__go" onClick={onDone}>
            Back to the table
          </button>
        </div>
      </div>
    );

  return (
    <div className="lesson__card arabic__question">
      <p className="lesson__kicker">
        The Coach’s phrases · {index + 1} of {tips.length}
      </p>
      <p>You said:</p>
      <p className="arabic__coach-said-big" lang="ar" dir="rtl">
        {tip.said}
      </p>
      <h2 className="lesson__subtitle">How would a Palestinian say it?</h2>
      {open ? (
        <>
          <p className="arabic__coach-better" lang="ar" dir="rtl">
            {tip.better}
          </p>
          <p className="arabic__bubble-he" lang="he" dir="rtl">
            {lineInHebrew(tip.better)}
          </p>
          <Glosses line={tip.better} glossary={glossary} />
          <p className="arabic__coach-why">{tip.why}</p>
          <div className="lesson__actions">
            <button type="button" className="lesson__plain" onClick={() => grade('again')}>
              Not yet
            </button>
            <button type="button" className="lesson__go" onClick={() => grade('good')}>
              I had it
            </button>
          </div>
        </>
      ) : (
        <div className="lesson__actions">
          <button type="button" className="lesson__go" autoFocus onClick={() => setOpen(true)}>
            Show
          </button>
        </div>
      )}
    </div>
  );
}
