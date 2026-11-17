import { useCallback, useEffect, useState } from 'react';
import type { CompassLine } from './compass.ts';
import { habitRows, type Ledger as LedgerData, type LedgerRow } from './ledger.ts';
import './ledger.css';

/**
 * Your House's ledger (docs/game/ledger.md): what you've learned, guild by guild, and the habit.
 * Every number is from data already saved.
 */
export function Ledger({
  onLoad,
  roads,
}: {
  /** Reads the ledger; rejects if it couldn't. */
  onLoad: () => Promise<LedgerData>;
  /** The compass's lines, for "Step 14 of 74". */
  roads: readonly CompassLine[];
}) {
  const [ledger, setLedger] = useState<LedgerData | null>(null);
  const [failed, setFailed] = useState(false);
  const load = useCallback(() => {
    setFailed(false);
    onLoad().then(setLedger, () => setFailed(true));
  }, [onLoad]);
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
              <button type="button" className="place__retry" onClick={load}>
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
        </>
      )}
    </section>
  );
}

function Rows({ rows }: { rows: readonly LedgerRow[] }) {
  return (
    <dl className="ledger__rows">
      {rows.map((r) => (
        <div key={r.label} className="ledger__row">
          <dt>{r.label}</dt>
          <dd>{r.value}</dd>
        </div>
      ))}
    </dl>
  );
}
