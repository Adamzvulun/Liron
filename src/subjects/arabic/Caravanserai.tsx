import { useState } from 'react';
import type { SubjectApi } from '../../core/subject.ts';
import { Courtyard, type CourtyardDoor } from './hall/Courtyard.tsx';
import { ScriptLesson } from './lesson/ScriptLesson.tsx';
import { Trial } from './lesson/Trial.tsx';
import './arabic.css';

type View = 'hall' | CourtyardDoor;
const VIEWS: readonly View[] = ['hall', 'lesson', 'listen', 'read', 'trial'];

/**
 * Inside the Caravanserai: the painted courtyard (#42), and behind its stations the script
 * lesson, the fountain's listening, the storyteller's reading (#38–#41) and the Painted Sign
 * (#43). ?open=lesson (or listen, read, trial) in the address goes straight there (for tests).
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
