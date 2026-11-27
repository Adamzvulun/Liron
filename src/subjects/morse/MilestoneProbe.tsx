import { useEffect, useState } from 'react';
import type { SubjectApi } from '../../core/subject.ts';
import { parseProgress, type MorseProgress } from './lesson/progress.ts';
import { LongCopy } from './words/LongCopy.tsx';
import './lesson/lesson.css';
import './words/words.css';

/** The milestone check's probe: one Long Copy, scored in percent and never saved as a round. */
export function MilestoneProbe({
  api,
  onDone,
  onSkip,
}: {
  api: SubjectApi;
  onDone: (percent: number | null) => void;
  onSkip: () => void;
}) {
  const [progress, setProgress] = useState<MorseProgress | null>(null);
  useEffect(() => {
    void api.loadState().then((s) => setProgress(parseProgress(s)), onSkip);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- loaded once; a re-render mustn't restart the line
  }, [api]);
  if (!progress) return <p className="ledger__note">Tuning the radio…</p>;
  return (
    <LongCopy
      api={api}
      progress={progress}
      onScore={(s) => onDone(Math.round(s * 100))}
      onAgain={onSkip}
      onLeave={onSkip}
    />
  );
}
