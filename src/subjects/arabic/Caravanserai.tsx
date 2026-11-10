import { useState } from 'react';
import type { SubjectApi } from '../../core/subject.ts';
import { Courtyard, type CourtyardDoor } from './hall/Courtyard.tsx';
import { ScriptLesson } from './lesson/ScriptLesson.tsx';
import { Trial } from './lesson/Trial.tsx';
import { Slate } from './write/Slate.tsx';
import { CoffeeCorner } from './phrases/CoffeeCorner.tsx';
import { WordLessons } from './core/WordLessons.tsx';
import { EchoWell } from './echo/EchoWell.tsx';
import './arabic.css';

type View = 'hall' | CourtyardDoor;
const VIEWS: readonly View[] = [
  'hall',
  'lesson',
  'listen',
  'read',
  'write',
  'phrases',
  'words',
  'trial',
  'regular',
  'echo',
];

/**
 * Inside the Caravanserai: the painted courtyard (#42), and behind its stations the script
 * lesson, the fountain's listening, the storyteller's reading (#38–#41) and the Painted Sign
 * (#43), the slate's writing (#41), the coffee corner's phrases (#45) and the innkeeper's word
 * lessons (#160) with the regulars' trials (#161). ?open=lesson (or listen, read, write, phrases,
 * words, trial, regular) in the address goes straight there (for tests).
 */
export function Caravanserai({ api }: { api: SubjectApi }) {
  const [view, setView] = useState<View>(() => {
    const open =
      typeof location !== 'undefined' ? new URLSearchParams(location.search).get('open') : null;
    return VIEWS.find((v) => v === open) ?? 'hall';
  });
  if (view === 'hall') return <Courtyard api={api} onOpen={setView} />;
  return (
    <>
      <button type="button" className="arabic__back" onClick={() => setView('hall')}>
        ← Courtyard
      </button>
      {view === 'trial' ? (
        <Trial api={api} />
      ) : view === 'write' ? (
        <Slate api={api} />
      ) : view === 'phrases' ? (
        <CoffeeCorner api={api} />
      ) : view === 'echo' ? (
        <EchoWell api={api} />
      ) : view === 'words' || view === 'regular' ? (
        <WordLessons key={view} api={api} trial={view === 'regular'} />
      ) : (
        <ScriptLesson
          key={view}
          api={api}
          only={view === 'listen' || view === 'read' ? view : undefined}
        />
      )}
    </>
  );
}
