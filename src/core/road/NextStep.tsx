// The first button at the end of every session, trial and round (docs/game/the-road.md §6):
// "Next: ⟨the road's next step⟩", going straight to that step's door, under the title and the
// line of story of any step this session finished. Outside a hall it shows nothing.
import { useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
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
  useEffect(() => {
    let live = true;
    void loadState().then(
      (state) => live && setBefore({ view, ids: new Set(read(state).done.map((s) => s.id)) }),
      () => {},
    );
    return () => {
      live = false;
    };
  }, [view, loadState, read]);
  const here = useMemo<RoadHere>(
    () => ({ view, before: before?.view === view ? before.ids : null, loadState, read, go, text }),
    [view, before, loadState, read, go, text],
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
  const loadState = here?.loadState;
  const read = here?.read;
  useEffect(() => {
    if (!loadState || !read) return;
    let live = true;
    // After this render's own effects, so a save the result screen starts is waited for.
    const wait = setTimeout(() => {
      void loadState().then(
        (state) => live && setNow(read(state)),
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
  const before = here.before;
  const finished = before ? now.done.filter((s) => !before.has(s.id)) : [];
  const door = answer.now.kind === 'step' ? answer.now.step.door : answer.now.door;
  const words = answer.now.kind === 'step' ? answer.now.step.invite : answer.now.line;
  const text = here.text ?? ((w: string) => w);
  return (
    <>
      {finished.map((s) => (
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
