import { useEffect, useState } from 'react';
import { probePercent } from '../../core/milestone/milestone.ts';
import type { SubjectApi } from '../../core/subject.ts';
import { coreWordsFrom, wordQuestions, type WordQuestion } from './core/coreWords.ts';
import { probeWords } from './milestone.ts';
import { parseProgress } from './progress.ts';
import { DECK } from './words.ts';

/**
 * The milestone check's probe: Read words from the chapters you've passed. It plays no sound and
 * saves no review or rating; only the score is handed back.
 */
export function MilestoneProbe({
  api,
  onDone,
  onSkip,
}: {
  api: SubjectApi;
  onDone: (percent: number | null) => void;
  onSkip: () => void;
}) {
  const [questions, setQuestions] = useState<WordQuestion[] | null>(null);
  const [right, setRight] = useState(0);
  const [at, setAt] = useState(0);
  useEffect(() => {
    let live = true;
    Promise.all([api.loadState(), api.privateContent(DECK)]).then(
      ([state, deck]) => {
        if (!live) return;
        const chapters = coreWordsFrom(deck.items);
        const words = probeWords(chapters, parseProgress(state), Math.random);
        const qs = wordQuestions(words, chapters.flat(), Math.random, ['read']);
        if (qs.length === 0) onDone(null);
        else setQuestions(qs);
      },
      () => live && onSkip(),
    );
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- the probe is built once
  }, [api]);
  const q = questions?.[at];
  if (!questions || !q) return <p className="milestone__note">Setting out the words…</p>;
  const pick = (choice: string) => {
    const total = right + (choice === q.answer ? 1 : 0);
    setRight(total);
    if (at + 1 < questions.length) setAt(at + 1);
    else onDone(probePercent(total, questions.length));
  };
  return (
    <div className="milestone__probe">
      <p className="milestone__kicker">
        Read · {at + 1} of {questions.length}
      </p>
      <p className="milestone__prompt">What does this word mean?</p>
      <p className="milestone__word">
        <bdi lang="ar" dir="rtl">
          {q.word.arabic}
        </bdi>
      </p>
      <div className="milestone__choices" role="group" aria-label="Choices">
        {q.choices.map((c) => (
          <button key={c} type="button" className="milestone__go" onClick={() => pick(c)}>
            {c}
          </button>
        ))}
      </div>
      <button type="button" className="milestone__go" onClick={onSkip}>
        Leave
      </button>
    </div>
  );
}
