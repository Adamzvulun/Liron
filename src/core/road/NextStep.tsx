// The first button at the end of every session, trial and round (docs/game/the-road.md §6):
// "Next: ⟨the road's next step⟩", going straight to that step's door, under the title and the
// line of story of any step this session finished. Outside a hall it shows nothing.
import {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { HALL_DOOR } from './road.ts';
import { RoadHereContext, type RoadHere, type RoadReading } from './roadHere.ts';
import './road.css';

/** The hall's side: remembers what was done when a door was opened. */
export function RoadGuide({
  view,
  loadState,
  read,
  go,
  text,
  children,
}: Omit<RoadHere, 'before'> & { children: ReactNode }) {
  const [before, setBefore] = useState<{ view: string; ids: ReadonlySet<string> } | null>(null);
  // Read once per door, not again when `read` changes: the road's facts can arrive mid-session,
  // and a step finished by then would never be announced (review, 2026-11-19).
  const reader = useRef(read);
  useEffect(() => {
    reader.current = read;
  }, [read]);
  useEffect(() => {
    let live = true;
    void loadState().then(
      (state) =>
        live && setBefore({ view, ids: new Set(reader.current(state).done.map((s) => s.id)) }),
      () => {},
    );
    return () => {
      live = false;
    };
  }, [view, loadState]);
  const seen = useCallback(
    (ids: ReadonlySet<string>) =>
      setBefore((b) => (b?.view === view ? { view, ids: new Set([...b.ids, ...ids]) } : b)),
    [view],
  );
  const here = useMemo<RoadHere>(
    () => ({
      view,
      before: before?.view === view ? before.ids : null,
      loadState,
      read,
      go,
      seen,
      text,
    }),
    [view, before, loadState, read, go, seen, text],
  );
  return <RoadHereContext value={here}>{children}</RoadHereContext>;
}

/**
 * Put it just before a result screen's own first button. `onHere` starts this screen's next
 * round, for when the road's next step is the screen the player is already on.
 */
export function NextStep({ onHere }: { onHere?: () => void }) {
  const here = useContext(RoadHereContext);
  const [now, setNow] = useState<RoadReading | null>(null);
  /** The steps this screen announces, fixed when it reads the road (it tells the hall, below). */
  const [finished, setFinished] = useState<RoadReading['done'] | null>(null);
  const loadState = here?.loadState;
  const read = here?.read;
  // What the hall knew at the door, and how to tell it what this screen announced: read when the
  // road is, so the announcement is fixed then and the next round doesn't repeat it (review,
  // 2026-11-19).
  const hall = useRef({ before: here?.before ?? null, seen: here?.seen });
  const announced = useRef(false);
  useEffect(() => {
    hall.current = { before: here?.before ?? null, seen: here?.seen };
  }, [here?.before, here?.seen]);
  useEffect(() => {
    if (!loadState || !read) return;
    let live = true;
    // After this render's own effects, so a save the result screen starts is waited for.
    const wait = setTimeout(() => {
      void loadState().then(
        (state) => {
          if (!live) return;
          const reading = read(state);
          setNow(reading);
          // Announced once per screen: a later reading (the road's facts arriving) keeps it.
          if (announced.current) return;
          const { before, seen } = hall.current;
          const fresh = before ? reading.done.filter((s) => !before.has(s.id)) : [];
          announced.current = true;
          setFinished(fresh);
          if (fresh.length) seen?.(new Set(fresh.map((s) => s.id)));
        },
        () => {},
      );
    });
    return () => {
      live = false;
      clearTimeout(wait);
    };
  }, [loadState, read]);
  if (!here || !now) return null;
  const { answer } = now;
  const door = answer.now.kind === 'step' ? answer.now.step.door : answer.now.door;
  const words = answer.now.kind === 'step' ? answer.now.step.invite : answer.now.line;
  const text = here.text ?? ((w: string) => w);
  return (
    <>
      {(finished ?? []).map((s) => (
        <div key={s.id} className="road-next__done">
          <p className="road-next__kicker">A step of your road</p>
          <p className="road-next__title">{s.title}</p>
          {s.beat && <p className="road-next__beat">{text(s.beat)}</p>}
        </div>
      ))}
      <button
        type="button"
        className="lesson__go road-next__go"
        onClick={() => (door === here.view && onHere ? onHere() : here.go(door))}
      >
        Next: {door === HALL_DOOR ? words : words.replace(/\.$/, '')}
      </button>
    </>
  );
}
