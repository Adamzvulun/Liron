import { useState } from 'react';
import type { SubjectApi } from '../../core/subject.ts';
import { KochLesson } from './lesson/Lesson.tsx';
import { Recognition } from './recognition/Recognition.tsx';
import './recognition/recognition.css';

const TABS = [
  { id: 'koch', label: 'Koch lessons' },
  { id: 'recognition', label: 'Instant Recognition' },
] as const;

/** Inside the Signal Tower: the Koch lessons (#31) and Instant Recognition (#32). */
export function TowerHall({ api }: { api: SubjectApi }) {
  const [tab, setTab] = useState<(typeof TABS)[number]['id']>('koch');
  return (
    <>
      <div className="tower__tabs" role="tablist" aria-label="Signal Tower">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            className="tower__tab"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>
      {tab === 'koch' ? <KochLesson api={api} /> : <Recognition api={api} />}
    </>
  );
}
