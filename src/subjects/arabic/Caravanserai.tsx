import { Fragment, useCallback, useMemo, useState, type ReactNode } from 'react';
import type { SubjectApi } from '../../core/subject.ts';
import { HallBackdrop } from '../../core/city/HallBackdrop.tsx';
import { Courtyard, type CourtyardDoor } from './hall/Courtyard.tsx';
import { KHAN_STAGE, wholeCourtyard } from './hall/paintKhan.ts';
import { INN_TABLE_STAGE, paintInnTable } from './hall/paintInnTable.ts';
import { ScriptLesson } from './lesson/ScriptLesson.tsx';
import { Trial } from './lesson/Trial.tsx';
import { Slate } from './write/Slate.tsx';
import { CoffeeCorner } from './phrases/CoffeeCorner.tsx';
import { WordLessons } from './core/WordLessons.tsx';
import { EchoWell } from './echo/EchoWell.tsx';
import { InnChat } from './chat/InnChat.tsx';
import { StrangerAtTheGate } from './finale/StrangerAtTheGate.tsx';
import { RoadGuide } from '../../core/road/NextStep.tsx';
import type { RoadReading } from '../../core/road/roadHere.ts';
import { ArabicText } from './ArabicText.tsx';
import { localDay, parseProgress } from './progress.ts';
import { ARABIC_ROAD, arabicDone, arabicRoad } from './road.ts';
import { useRoadFacts, type RoadFacts } from '../../core/road/facts.ts';
import './arabic.css';

/** Where a saved state stands on the road, for the "Next" button after a session. */
const roadReader =
  (facts: RoadFacts) =>
  (state: unknown): RoadReading => {
    const p = parseProgress(state);
    return {
      answer: arabicRoad(p, { today: localDay(), ...facts, due: 0 }),
      done: ARABIC_ROAD.filter((step) => arabicDone(step, p)),
    };
  };

const beat = (words: string): ReactNode => <ArabicText text={words} />;

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
  'chat',
  'gate',
];

/**
 * Inside the Caravanserai: the painted courtyard (#42), and behind its stations the script
 * lesson, the fountain's listening, the storyteller's reading (#38–#41) and the Painted Sign
 * (#43), the slate's writing (#41), the coffee corner's phrases (#45) and the innkeeper's word
 * lessons (#160) with the regulars' trials (#161) and chats (E17). ?open=lesson (or listen, read, write, phrases,
 * words, trial, regular, echo, chat, gate) in the address goes straight there (for tests).
 */
export function Caravanserai({ api }: { api: SubjectApi }) {
  const [view, setView] = useState<View>(() => {
    const open =
      typeof location !== 'undefined' ? new URLSearchParams(location.search).get('open') : null;
    return VIEWS.find((v) => v === open) ?? 'hall';
  });
  // Counts doors opened from a result screen, so the same door opens afresh.
  const [round, setRound] = useState(0);
  const loadState = useCallback(() => api.loadState(), [api]);
  const go = useCallback((door: string) => {
    setView(VIEWS.find((v) => v === door) ?? 'hall');
    setRound((n) => n + 1);
  }, []);
  const facts = useRoadFacts();
  const readRoad = useMemo(() => roadReader(facts), [facts]);
  if (view === 'hall') return <Courtyard api={api} onOpen={setView} />;
  return (
    <RoadGuide view={view} loadState={loadState} read={readRoad} go={go} text={beat}>
      {/* The word lessons and the regulars' trials sit at the innkeeper's table (roadmap A6). */}
      {view === 'words' || view === 'regular' || view === 'chat' || view === 'gate' ? (
        <HallBackdrop id="inn" {...INN_TABLE_STAGE} paint={paintInnTable} />
      ) : (
        <HallBackdrop id="khan" {...KHAN_STAGE} paint={wholeCourtyard} />
      )}
      <button type="button" className="arabic__back" onClick={() => setView('hall')}>
        ← Courtyard
      </button>
      <Fragment key={round}>
        {view === 'trial' ? (
          <Trial api={api} />
        ) : view === 'write' ? (
          <Slate api={api} />
        ) : view === 'phrases' ? (
          <CoffeeCorner api={api} />
        ) : view === 'echo' ? (
          <EchoWell api={api} />
        ) : view === 'chat' ? (
          <InnChat api={api} />
        ) : view === 'gate' ? (
          <StrangerAtTheGate api={api} onTable={() => go('chat')} />
        ) : view === 'words' || view === 'regular' ? (
          <WordLessons
            key={view}
            api={api}
            trial={view === 'regular'}
            onChat={() => setView('chat')}
          />
        ) : (
          <ScriptLesson
            key={view}
            api={api}
            only={view === 'listen' || view === 'read' ? view : undefined}
          />
        )}
      </Fragment>
    </RoadGuide>
  );
}
