import { useCallback, useEffect, useId, useRef, useState, type FormEvent } from 'react';
import { Avatar } from '../avatar/Avatar.tsx';
import { Link } from '../Link.tsx';
import { FlameIcon } from '../player/icons.tsx';
import { wareName } from '../player/market.ts';
import type { Gift } from './together.ts';
import {
  dayLabel,
  FellowshipError,
  rankName,
  showCode,
  visitPath,
  tidyCode,
  type FellowshipProblem,
  type FellowshipSource,
  type FriendCard,
  type FriendRequest,
} from './fellowship.ts';
import './fellowship.css';
import './together.css';

type Loaded = { cards: FriendCard[]; requests: FriendRequest[]; code: string };

/** What to say when an action is refused, by why. */
const REFUSED: Record<FellowshipProblem, string> = {
  'daily-limit': 'That’s enough for today. Try again tomorrow.',
  waiting: 'Five of your requests are still waiting. Wait for an answer first.',
  full: 'A Fellowship holds 20 friends at most.',
  failed: 'Couldn’t reach Waymark just now. Try again in a moment.',
};
const refused = (e: unknown) => REFUSED[e instanceof FellowshipError ? e.problem : 'failed'];

/**
 * Your House's Fellowship (task 3.1, #326; docs/game/fellowship.md): your friend code, requests
 * waiting for you, and your friends, each with what fellowship.md §3 lets them share.
 */
export function Fellowship({
  source,
  gifts,
  today,
  named = true,
}: {
  source: FellowshipSource;
  /** Has the player given themselves a name? Friends see "A traveler" until they do. */
  named?: boolean;
  /** Gifts friends sent you (task 3.5); absent without a database. */
  gifts?: () => Promise<Gift[]>;
  today?: string;
}) {
  const [received, setReceived] = useState<Gift[]>([]);
  useEffect(() => {
    if (!gifts) return;
    let live = true;
    gifts().then(
      (g) => live && setReceived(g),
      () => undefined,
    );
    return () => {
      live = false;
    };
  }, [gifts]);
  const [state, setState] = useState<Loaded | 'loading' | 'failed'>('loading');
  const [said, setSaid] = useState('');

  const load = useCallback(
    () =>
      Promise.all([source.cards(), source.requests(), source.code()]).then(
        ([cards, requests, code]) => setState({ cards, requests, code }),
        () => setState('failed'),
      ),
    [source],
  );

  useEffect(() => {
    // The load's promise mustn't become this effect's cleanup.
    void load();
  }, [load]);

  /** One action at a time: a double click mustn't spend two of the day's new codes. */
  const running = useRef(false);
  /** Runs an action, then reads the list again. */
  const act = async (what: () => Promise<unknown>, done: string) => {
    if (running.current) return false;
    running.current = true;
    try {
      await what();
      setSaid(done);
    } catch (e) {
      setSaid(refused(e));
      return false;
    } finally {
      running.current = false;
    }
    await load();
    return true;
  };

  return (
    <section className="fellowship" aria-labelledby="fellowship-title">
      <h2 id="fellowship-title" className="fellowship__heading">
        Fellowship
      </h2>
      {state === 'loading' && <p className="fellowship__note">Reading the guest book…</p>}
      {state === 'failed' && (
        <p className="fellowship__note" role="status">
          Your Fellowship couldn’t be read.{' '}
          <button
            type="button"
            className="place__retry"
            onClick={() => {
              setState('loading');
              void load();
            }}
          >
            Try again
          </button>
        </p>
      )}
      {typeof state === 'object' && (
        <>
          <Requests
            requests={state.requests}
            onAnswer={(r, yes) =>
              act(
                () => source.answer(r.id, yes),
                yes ? `${r.name} joined your Fellowship.` : `You declined ${r.name}.`,
              )
            }
          />
          {received.length > 0 && (
            <>
              <h3 className="fellowship__subheading">Gifts for you</h3>
              <ul className="fellowship__gifts">
                {received.map((g) => (
                  <li key={g.id}>
                    {g.name} sent you the {wareName({ id: g.item })}
                    {today && g.day ? ` · ${dayLabel(g.day, today)}` : ''}. It’s in your wardrobe.
                  </li>
                ))}
              </ul>
            </>
          )}
          <Friends
            friends={state.cards.filter((c) => !c.me)}
            onRemove={(f) => act(() => source.remove(f.id), `${f.name} has left your Fellowship.`)}
          />
          {!named && (
            <p className="fellowship__note fellowship__unnamed">
              Friends see you as “A traveler” until you give yourself a name: Settings, the gear at
              the top, then Your name.
            </p>
          )}
          <Codes
            code={state.code}
            onAsk={(code) =>
              act(
                () => source.ask(code),
                'Sent. If that code is right, they’ll see your request, and you’ll be friends when they accept.',
              )
            }
            onNewCode={() =>
              act(() => source.newCode(), 'You have a new code. The old one no longer works.')
            }
          />
          <p className="fellowship__said" role="status">
            {said}
          </p>
        </>
      )}
    </section>
  );
}

function Requests({
  requests,
  onAnswer,
}: {
  requests: FriendRequest[];
  onAnswer: (r: FriendRequest, yes: boolean) => Promise<boolean>;
}) {
  if (requests.length === 0) return null;
  return (
    <ul className="fellowship__requests" aria-label="Requests for you">
      {requests.map((r) => (
        <li key={r.id} className="fellowship__request">
          <Avatar
            look={r.look}
            view="portrait"
            className="fellowship__face"
            width={56}
            height={56}
          />
          <p className="fellowship__ask">{r.name} would like to join your Fellowship.</p>
          <div className="fellowship__buttons">
            <button
              type="button"
              className="fellowship__button"
              onClick={() => void onAnswer(r, true)}
            >
              Accept
            </button>
            <button
              type="button"
              className="fellowship__button fellowship__button--quiet"
              onClick={() => void onAnswer(r, false)}
            >
              Decline
            </button>
          </div>
        </li>
      ))}
    </ul>
  );
}

function Friends({
  friends,
  onRemove,
}: {
  friends: FriendCard[];
  onRemove: (f: FriendCard) => Promise<boolean>;
}) {
  const [removing, setRemoving] = useState<string | null>(null);
  if (friends.length === 0) {
    return (
      <p className="fellowship__empty">
        No friends here yet. Give a friend your code below, or type theirs. Once they accept, they
        appear here, and you can visit each other’s houses.
      </p>
    );
  }
  return (
    <ul className="fellowship__friends" aria-label="Your friends">
      {friends.map((f) => (
        <li key={f.id} className="fellowship__friend">
          <Avatar
            look={f.look}
            view="portrait"
            className="fellowship__face"
            width={72}
            height={72}
          />
          <div className="fellowship__who">
            <h3 className="fellowship__name">{f.name}</h3>
            <p className="fellowship__line">
              Level {f.level}
              {f.title && <> · {f.title}</>}
            </p>
            <p className="fellowship__line">
              <span className="fellowship__flame">
                <FlameIcon />
              </span>{' '}
              {f.streak === 1 ? '1 day' : `${f.streak} days`} in a row
              {f.achievements.length > 0 && (
                <>
                  {' · '}
                  {f.achievements.length === 1
                    ? '1 achievement'
                    : `${f.achievements.length} achievements`}
                </>
              )}
            </p>
            {f.ranks.length > 0 && (
              <ul className="fellowship__ranks" aria-label={`${f.name}’s ranks`}>
                {f.ranks.map((r) => (
                  <li key={r}>{rankName(r)}</li>
                ))}
              </ul>
            )}
          </div>
          <div className="fellowship__buttons">
            <Link className="fellowship__button" href={visitPath(f.id)}>
              Visit {f.name}’s house
            </Link>
            {removing === f.id ? (
              <>
                <button
                  type="button"
                  className="fellowship__button fellowship__button--quiet"
                  onClick={() => void onRemove(f).then(() => setRemoving(null))}
                >
                  Yes, remove {f.name}
                </button>
                <button
                  type="button"
                  className="fellowship__button fellowship__button--quiet"
                  onClick={() => setRemoving(null)}
                >
                  Cancel
                </button>
              </>
            ) : (
              <button
                type="button"
                className="fellowship__button fellowship__button--quiet"
                onClick={() => setRemoving(f.id)}
              >
                Remove
              </button>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}

function Codes({
  code,
  onAsk,
  onNewCode,
}: {
  code: string;
  onAsk: (code: string) => Promise<boolean>;
  onNewCode: () => Promise<boolean>;
}) {
  const hintId = useId();
  const [typed, setTyped] = useState('');
  const [renewing, setRenewing] = useState(false);
  const ready = tidyCode(typed).length === 8;
  const send = async (e: FormEvent) => {
    e.preventDefault();
    if (!ready) return;
    if (await onAsk(typed)) setTyped('');
  };
  return (
    <div className="fellowship__codes">
      <div className="fellowship__mine">
        <p className="fellowship__label">Your friend code</p>
        <p
          className="fellowship__plate"
          aria-label={`Your friend code: ${code.split('').join(' ')}`}
        >
          {showCode(code)}
        </p>
        <p className="fellowship__hint">Give it only to people you want in your Fellowship.</p>
        {renewing ? (
          <div className="fellowship__buttons">
            <button
              type="button"
              className="fellowship__button fellowship__button--quiet"
              onClick={() => void onNewCode().then(() => setRenewing(false))}
            >
              Yes, make a new code
            </button>
            <button
              type="button"
              className="fellowship__button fellowship__button--quiet"
              onClick={() => setRenewing(false)}
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            type="button"
            className="fellowship__button fellowship__button--quiet"
            onClick={() => setRenewing(true)}
          >
            Make a new code
          </button>
        )}
      </div>
      <form className="fellowship__add" onSubmit={(e) => void send(e)}>
        <label className="fellowship__label" htmlFor={`${hintId}-code`}>
          Add a friend
        </label>
        <input
          id={`${hintId}-code`}
          className="fellowship__input"
          value={typed}
          maxLength={12}
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          placeholder="ABCD-EFGH"
          aria-describedby={hintId}
          onChange={(e) => setTyped(e.target.value)}
        />
        <p id={hintId} className="fellowship__hint">
          Type the 8-letter code a friend gave you.
        </p>
        <button type="submit" className="fellowship__button" disabled={!ready}>
          Send a request
        </button>
      </form>
    </div>
  );
}
