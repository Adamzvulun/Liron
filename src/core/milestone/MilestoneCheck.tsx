import { useEffect, useState } from 'react';
import type { MilestoneKit, SubjectApi, SubjectInfo } from '../subject.ts';
import { ANSWERS, STATEMENTS } from './milestone.ts';
import './milestone.css';

/** What the check needs of a subject: its info, its kit once loaded, and its own api. */
export interface CheckSubject {
  info: SubjectInfo;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- each subject has its own state
  api: SubjectApi<any>;
}

/**
 * The milestone check (docs/game/milestone-check.md), in Your House beside the ledger: for each
 * guild you've started, six can-do statements, then a short probe. Each guild's row is saved as
 * soon as its probe ends. The probe changes no review or rating.
 */
export function MilestoneCheck({
  subjects,
  onSave,
}: {
  subjects: readonly CheckSubject[];
  /** Saves one guild's check; rejects if it couldn't. */
  onSave: (subject: string, answers: number[], probe: number | null) => Promise<void>;
}) {
  // The guilds being checked, fixed when the check starts: the compass may move meanwhile.
  const [queue, setQueue] = useState<CheckSubject[]>([]);
  const [at, setAt] = useState<number | null>(null);
  // Sticky for the whole run: the guilds whose row couldn't be saved, and those left early.
  const [failed, setFailed] = useState<string[]>([]);
  const [skipped, setSkipped] = useState<string[]>([]);
  const [done, setDone] = useState(false);
  const current = at === null ? undefined : queue[at];
  const next = () =>
    at !== null && at + 1 < queue.length ? setAt(at + 1) : (setAt(null), setDone(true));
  if (subjects.length === 0) return null;
  return (
    <section className="ledger__page milestone" aria-labelledby="milestone-title">
      <h3 id="milestone-title" className="ledger__place">
        The milestone check
      </h3>
      {current ? (
        <Step
          key={current.info.id}
          subject={current}
          onSave={async (answers, probe) => {
            try {
              await onSave(current.info.id, answers, probe);
            } catch {
              setFailed((f) => [...f, current.info.place]);
            }
            next();
          }}
          onSkip={() => {
            setSkipped((f) => [...f, current.info.place]);
            next();
          }}
        />
      ) : (
        <>
          <p className="ledger__note">
            {done
              ? 'Finished. Any new points are on the ledger above.'
              : 'About five minutes, once a month. Say what you can do, then show it. Nothing here changes your reviews or ratings.'}
          </p>
          {failed.length > 0 && (
            <p className="ledger__note" role="alert">
              Couldn’t save: {failed.join(', ')}. Check your connection and take the check again.
            </p>
          )}
          {skipped.length > 0 && (
            <p className="ledger__note">Left early, so not saved: {skipped.join(', ')}.</p>
          )}
          <p className="ledger__note">
            One check a day for each guild is kept: a second one on the same day isn’t saved.
          </p>
          <button
            type="button"
            className="milestone__go"
            onClick={() => (
              setDone(false),
              setFailed([]),
              setSkipped([]),
              setQueue([...subjects]),
              setAt(0)
            )}
          >
            {done ? 'Take it again' : 'Take the check'}
          </button>
        </>
      )}
    </section>
  );
}

function Step({
  subject,
  onSave,
  onSkip,
}: {
  subject: CheckSubject;
  onSave: (answers: number[], probe: number | null) => Promise<void>;
  onSkip: () => void;
}) {
  const [kit, setKit] = useState<MilestoneKit | null>(null);
  const [failed, setFailed] = useState(false);
  const [answers, setAnswers] = useState<(number | undefined)[]>([]);
  const [probing, setProbing] = useState(false);
  useEffect(() => {
    void subject.info.milestone?.().then(setKit, () => setFailed(true));
  }, [subject]);
  if (failed || (!kit && !subject.info.milestone))
    return (
      <p className="ledger__note">
        This guild’s check couldn’t be loaded.{' '}
        <button type="button" className="milestone__go" onClick={onSkip}>
          Go on
        </button>
      </p>
    );
  if (!kit)
    return (
      <p className="ledger__note" role="status">
        Opening the check…
      </p>
    );
  if (probing)
    return (
      <>
        <h4 className="milestone__guild">{subject.info.place}: show it</h4>
        <kit.Probe
          api={subject.api}
          onSkip={onSkip}
          onDone={(percent) =>
            void onSave(
              answers.map((a) => a ?? 0),
              percent,
            )
          }
        />
      </>
    );
  const ready = answers.filter((a) => a !== undefined).length === STATEMENTS;
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (ready) setProbing(true);
      }}
    >
      <h4 className="milestone__guild">{subject.info.place}: can you?</h4>
      {kit.statements.map((text, i) => (
        <fieldset key={text} className="milestone__can">
          <legend>{text}</legend>
          {ANSWERS.map((label, value) => (
            <label key={label} className={answers[i] === value ? 'is-picked' : ''}>
              <input
                type="radio"
                name={`can${i}`}
                checked={answers[i] === value}
                onChange={() => setAnswers((a) => Object.assign([...a], { [i]: value }))}
              />
              {label}
            </label>
          ))}
        </fieldset>
      ))}
      <button type="submit" className="milestone__go" disabled={!ready}>
        Next: show it
      </button>
    </form>
  );
}
