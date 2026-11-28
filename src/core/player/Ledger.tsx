import { useCallback, useEffect, useState, type ReactNode } from 'react';
import type { CompassLine } from './compass.ts';
import { habitRows, type Ledger as LedgerData, type LedgerRow } from './ledger.ts';
import { canDoPercent } from '../milestone/milestone.ts';
import type { MilestoneRow } from '../progress/store.ts';
import './ledger.css';

/**
 * Your House's ledger (docs/game/ledger.md): what you've learned, guild by guild, and the habit.
 * Every number is from data already saved.
 */
export function Ledger({
  onLoad,
  roads,
  check,
}: {
  /** Reads the ledger; rejects if it couldn't. */
  onLoad: () => Promise<LedgerData>;
  /** The compass's lines, for "Step 14 of 74". */
  roads: readonly CompassLine[];
  /** The milestone check, shown as the last page. */
  check?: ReactNode;
}) {
  const [ledger, setLedger] = useState<LedgerData | null>(null);
  const [failed, setFailed] = useState(false);
  const load = useCallback(() => void onLoad().then(setLedger, () => setFailed(true)), [onLoad]);
  const retry = () => {
    setFailed(false);
    load();
  };
  useEffect(() => {
    load();
  }, [load]);
  return (
    <section className="ledger" aria-labelledby="ledger-title">
      <h2 id="ledger-title" className="ledger__heading">
        Ledger
      </h2>
      {!ledger ? (
        <p className="ledger__note" role="status">
          {failed ? (
            <>
              The ledger couldn’t be read.{' '}
              <button type="button" className="place__retry" onClick={retry}>
                Try again
              </button>
            </>
          ) : (
            'Opening the ledger…'
          )}
        </p>
      ) : (
        <>
          {ledger.blocks.map((b) => {
            const road = roads.find((r) => r.subject === b.subject)?.progress;
            return (
              <section
                key={b.subject}
                className="ledger__page"
                style={{ '--ledger-guild': b.color } as React.CSSProperties}
                aria-label={b.place}
              >
                <h3 className="ledger__place">{b.place}</h3>
                {road && <p className="ledger__road">{road}</p>}
                {b.answer ? (
                  <>
                    <Rows rows={b.answer.rows} />
                    <p className="ledger__trend">{b.answer.trend}</p>
                  </>
                ) : (
                  <p className="ledger__note">This guild’s numbers couldn’t be read.</p>
                )}
                <Checks rows={ledger.checks?.filter((c) => c.subject === b.subject) ?? []} />
              </section>
            );
          })}
          <section className="ledger__page ledger__page--habit" aria-label="Your habit">
            <h3 className="ledger__place">Your habit</h3>
            {ledger.habit ? (
              <Rows rows={habitRows(ledger.habit)} />
            ) : (
              <p className="ledger__note">Your days couldn’t be read.</p>
            )}
          </section>
          {ledger.checks === null && (
            <p className="ledger__note">Your milestone checks couldn’t be read.</p>
          )}
          {check}
        </>
      )}
    </section>
  );
}

/** A value longer than this (a capstone's distance) gets a line of its own, where it wraps. */
const LONG_VALUE = 16;

function Rows({ rows }: { rows: readonly LedgerRow[] }) {
  return (
    <dl className="ledger__rows">
      {rows.map((r) => (
        <div
          key={r.label}
          className={`ledger__row${r.value.length > LONG_VALUE ? ' ledger__row--long' : ''}`}
        >
          <dt>{r.label}</dt>
          <dd>{r.value}</dd>
        </div>
      ))}
    </dl>
  );
}

const shown = (day: string) =>
  new Date(`${day}T00:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

/** A subject's milestone checks over time: a point for the can-do answers and one for the probe. */
function Checks({ rows }: { rows: readonly MilestoneRow[] }) {
  if (rows.length === 0) return null;
  const x = (i: number) => (rows.length === 1 ? 100 : 10 + (180 * i) / (rows.length - 1));
  const y = (pct: number) => 55 - pct * 0.5;
  return (
    <div className="milestone__checks">
      <h4 className="milestone__guild">Milestone checks</h4>
      <svg className="milestone__chart" viewBox="0 0 200 60" aria-hidden="true">
        <line x1="0" y1="55" x2="200" y2="55" stroke="currentColor" strokeOpacity="0.35" />
        {rows.map((r, i) => (
          <g key={r.day}>
            <circle cx={x(i)} cy={y(canDoPercent(r.answers))} r="4" fill="var(--ledger-guild)" />
            {r.probe !== null && (
              <rect x={x(i) - 3.5} y={y(r.probe) - 3.5} width="7" height="7" fill="var(--ink)" />
            )}
          </g>
        ))}
      </svg>
      <p className="milestone__note">Circle: what you say you can do. Square: the probe.</p>
      <ol className="milestone__list">
        {rows.map((r) => (
          <li key={r.day}>
            {shown(r.day)}: {r.answers.filter((a) => a === 2).length} yes,{' '}
            {r.answers.filter((a) => a === 1).length} with help,{' '}
            {r.answers.filter((a) => a === 0).length} not yet
            {r.probe === null ? '; no probe' : `; probe ${r.probe}%`}
          </li>
        ))}
      </ol>
    </div>
  );
}
