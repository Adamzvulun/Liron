import { useState } from 'react';
import type { SubjectApi } from '../../core/subject.ts';
import { Hall, type HallDoor } from './hall/Hall.tsx';
import { KochLesson } from './lesson/Lesson.tsx';
import { Recognition } from './recognition/Recognition.tsx';
import { Trial } from './lesson/Trial.tsx';
import './hall/hall.css';

/**
 * Inside the Signal Tower: the hall (#33) with the questline and the doors, and behind them the
 * Koch lessons (#31) and Instant Recognition (#32). Opening a door with ?open=koch or
 * ?open=recognition in the address goes straight there (for tests).
 */
export function TowerHall({ api }: { api: SubjectApi }) {
  const [view, setView] = useState<'hall' | HallDoor>(() => {
    const open =
      typeof location === 'undefined' ? null : new URLSearchParams(location.search).get('open');
    return open === 'koch' || open === 'recognition' || open === 'trial' ? open : 'hall';
  });
  if (view === 'hall') return <Hall api={api} onOpen={setView} />;
  return (
    <>
      <button type="button" className="hall__back" onClick={() => setView('hall')}>
        ← Tower hall
      </button>
      {view === 'koch' && <KochLesson api={api} />}
      {view === 'recognition' && <Recognition api={api} />}
      {view === 'trial' && <Trial api={api} onLeave={() => setView('hall')} />}
    </>
  );
}
