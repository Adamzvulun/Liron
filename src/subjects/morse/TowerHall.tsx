import { Fragment, useCallback, useState } from 'react';
import type { SubjectApi } from '../../core/subject.ts';
import { HallBackdrop } from '../../core/city/HallBackdrop.tsx';
import { paintRadioRoom, RADIO_STAGE } from '../../core/city/paintRadioRoom.ts';
import { Hall, type HallDoor } from './hall/Hall.tsx';
import { TOWER_STAGE, wholeTower } from './hall/paintTower.ts';
import { LISTENING_DESK_STAGE, paintListeningDesk } from './hall/paintListeningDesk.ts';
import { KochLesson } from './lesson/Lesson.tsx';
import { Recognition } from './recognition/Recognition.tsx';
import { Trial } from './lesson/Trial.tsx';
import { FarStation } from './qso/FarStation.tsx';
import { RadioRoom } from './qso/RadioRoom.tsx';
import { SendDrill } from './send/SendDrill.tsx';
import { WordDrill } from './words/WordDrill.tsx';
import { RoadGuide } from '../../core/road/NextStep.tsx';
import { localDay } from '../../core/road/road.ts';
import type { RoadReading } from '../../core/road/roadHere.ts';
import { parseProgress } from './lesson/progress.ts';
import { MORSE_ROAD, morseDone, morseRoad } from './road.ts';
import './hall/hall.css';

/** Where a saved state stands on the road, for the "Next" button after a session. */
function readRoad(state: unknown): RoadReading {
  const p = parseProgress(state);
  return {
    answer: morseRoad(p, { today: localDay(), partner: 'ready', licensee: true, due: 0 }),
    done: MORSE_ROAD.filter((step) => morseDone(step, p)),
  };
}

const DOORS: readonly HallDoor[] = [
  'koch',
  'recognition',
  'trial',
  'sending',
  'lamp',
  'words',
  'watch',
  'far',
  'radio',
];

/**
 * Inside the Signal Tower: the hall (#33) with the questline and the doors, and behind them the
 * Koch lessons (#31), Instant Recognition (#32), the trials (#34), sending (#35–#37) and the
 * Codebook's words (#154), and the rank trials: the Lamp Signal (#175), the Night Watch (#179) and
 * the Far Station (#178), and the Radio Room on the air (E16). Opening a door with ?open=koch, ?open=recognition, ?open=trial,
 * ?open=sending, ?open=lamp, ?open=words, ?open=watch, ?open=far or ?open=radio in the address goes straight
 * there (for tests).
 */
export function TowerHall({ api }: { api: SubjectApi }) {
  const [opening] = useState(() =>
    typeof location === 'undefined' ? null : new URLSearchParams(location.search).get('open'),
  );
  // ?open=rush (a challenge taken on in the Arena, task 3.4) opens the Codebook into a rush.
  const [view, setView] = useState<'hall' | HallDoor>(() =>
    opening === 'rush' ? 'words' : (DOORS.find((d) => d === opening) ?? 'hall'),
  );
  // Counts doors opened from a result screen, so the same door opens afresh.
  const [round, setRound] = useState(0);
  const loadState = useCallback(() => api.loadState(), [api]);
  const go = useCallback((door: string) => {
    setView(DOORS.find((d) => d === door) ?? 'hall');
    setRound((n) => n + 1);
  }, []);
  if (view === 'hall') return <Hall api={api} onOpen={setView} />;
  return (
    <RoadGuide view={view} loadState={loadState} read={readRoad} go={go}>
      {/* The Radio Room and the Far Station have a room of their own (roadmap A5); the lessons
          and drills sit at the listening desk (A6); the trials face the whole tower hall. */}
      {view === 'radio' || view === 'far' ? (
        <HallBackdrop id="radio" {...RADIO_STAGE} paint={paintRadioRoom} />
      ) : view === 'trial' ? (
        <HallBackdrop id="tower" {...TOWER_STAGE} paint={wholeTower} />
      ) : (
        <HallBackdrop id="desk" {...LISTENING_DESK_STAGE} paint={paintListeningDesk} />
      )}
      <button type="button" className="hall__back" onClick={() => setView('hall')}>
        ← Tower hall
      </button>
      <Fragment key={round}>
        {view === 'koch' && <KochLesson api={api} />}
        {view === 'recognition' && <Recognition api={api} />}
        {view === 'sending' && <SendDrill api={api} />}
        {view === 'lamp' && <SendDrill api={api} start="lamp" />}
        {view === 'words' && (
          <WordDrill api={api} start={opening === 'rush' && round === 0 ? 'rush' : undefined} />
        )}
        {view === 'watch' && <WordDrill api={api} start="watch" />}
        {view === 'far' && <FarStation api={api} onRoom={() => setView('radio')} />}
        {view === 'radio' && <RadioRoom api={api} onFar={() => setView('far')} />}
        {view === 'trial' && <Trial api={api} onLeave={() => setView('hall')} />}
      </Fragment>
    </RoadGuide>
  );
}
