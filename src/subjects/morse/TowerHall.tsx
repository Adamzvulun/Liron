import { useState } from 'react';
import type { SubjectApi } from '../../core/subject.ts';
import { Hall, type HallDoor } from './hall/Hall.tsx';
import { KochLesson } from './lesson/Lesson.tsx';
import { Recognition } from './recognition/Recognition.tsx';
import { Trial } from './lesson/Trial.tsx';
import { SendDrill } from './send/SendDrill.tsx';
import { WordDrill } from './words/WordDrill.tsx';
import './hall/hall.css';

const DOORS: readonly HallDoor[] = ['koch', 'recognition', 'trial', 'sending', 'words'];

/**
 * Inside the Signal Tower: the hall (#33) with the questline and the doors, and behind them the
 * Koch lessons (#31), Instant Recognition (#32), the trials (#34), sending (#35–#37) and the
 * Codebook's words (#154). Opening a door with ?open=koch, ?open=recognition, ?open=trial, ?open=sending or
 * ?open=words in the address goes straight there (for tests).
 */
export function TowerHall({ api }: { api: SubjectApi }) {
  const [view, setView] = useState<'hall' | HallDoor>(() => {
    const open =
      typeof location === 'undefined' ? null : new URLSearchParams(location.search).get('open');
    return DOORS.find((d) => d === open) ?? 'hall';
  });
  if (view === 'hall') return <Hall api={api} onOpen={setView} />;
  return (
    <>
      <button type="button" className="hall__back" onClick={() => setView('hall')}>
        ← Tower hall
      </button>
      {view === 'koch' && <KochLesson api={api} />}
      {view === 'recognition' && <Recognition api={api} />}
      {view === 'sending' && <SendDrill api={api} />}
      {view === 'words' && <WordDrill api={api} />}
      {view === 'trial' && <Trial api={api} onLeave={() => setView('hall')} />}
    </>
  );
}
