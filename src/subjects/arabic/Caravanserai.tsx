import { useEffect, useState } from 'react';
import type { SubjectApi } from '../../core/subject.ts';
import { LESSONS, lettersUpTo } from './letters.ts';
import { parseProgress, PASSES_NEEDED, type ArabicProgress } from './progress.ts';
import { Ar, ScriptLesson } from './lesson/ScriptLesson.tsx';
import './arabic.css';

type View = 'hall' | 'lesson';

/**
 * Inside the Caravanserai: the hall with your script lesson, and behind it the lesson itself
 * (#38–#41). ?open=lesson in the address goes straight there (for tests). The painted
 * courtyard (#42) replaces this hall.
 */
export function Caravanserai({ api }: { api: SubjectApi }) {
  const [view, setView] = useState<View>(() =>
    typeof location !== 'undefined' && new URLSearchParams(location.search).get('open') === 'lesson'
      ? 'lesson'
      : 'hall',
  );
  if (view === 'lesson')
    return (
      <>
        <button type="button" className="arabic__back" onClick={() => setView('hall')}>
          ← Courtyard
        </button>
        <ScriptLesson api={api} />
      </>
    );
  return <Hall api={api} onOpen={() => setView('lesson')} />;
}

function Hall({ api, onOpen }: { api: SubjectApi; onOpen: () => void }) {
  const [progress, setProgress] = useState<ArabicProgress | null>(null);
  useEffect(() => {
    let live = true;
    api.loadState().then(
      (s) => live && setProgress(parseProgress(s)),
      () => live && setProgress(parseProgress(null)),
    );
    return () => {
      live = false;
    };
  }, [api]);
  if (!progress) return <p className="arabic__loading">Lighting the lamps…</p>;
  const lesson = LESSONS[progress.lesson - 1];
  const known = progress.done ? lettersUpTo(LESSONS.length) : lettersUpTo(progress.lesson - 1);
  return (
    <div className="arabic__hall">
      <button type="button" className="arabic__door" onClick={onOpen}>
        <span className="arabic__door-title">The scribe’s table</span>
        <span>
          Lesson {progress.lesson} of {LESSONS.length}: {lesson?.title}
        </span>
        <span className="arabic__row">
          {lesson?.letters.map((l) => (
            <Ar key={l.id} className="arabic__chip">
              {l.letter}
            </Ar>
          ))}
        </span>
        {progress.streak > 0 && (
          <span>
            {progress.streak} of {PASSES_NEEDED} passes
          </span>
        )}
      </button>
      <div className="arabic__door is-soon" aria-disabled="true">
        <span className="arabic__door-title">Coffee corner</span>
        <span>Survival phrases · soon</span>
      </div>
      <p className="arabic__known">
        Letters you know: {known.length} of {lettersUpTo(LESSONS.length).length}
      </p>
    </div>
  );
}
