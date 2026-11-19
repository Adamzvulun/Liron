import { useEffect, useState } from 'react';
import { Link } from '../Link.tsx';
import {
  ChallengeError,
  type ChallengeProblem,
  ROUND_NAMES,
  type RoundsApi,
  type ScoredRound,
} from './challenges.ts';
import './challenges.css';

const PROBLEM: Record<ChallengeProblem, (name: string) => string> = {
  open: (name) => `${name} already has three of your challenges waiting.`,
  'daily-limit': () => 'That’s ten challenges today. More tomorrow.',
  'not-friends': (name) => `${name} isn’t in your Fellowship any more.`,
  closed: () => 'That couldn’t be sent. Try again in a moment.',
  failed: () => 'That couldn’t be sent. Try again in a moment.',
};

/**
 * Under a round's result (task 3.4, docs/game/challenges.md §4): what the round answered, and
 * "Challenge a friend with this score". Shows nothing to a player without friends.
 */
export function ChallengeOffer({ rounds, round }: { rounds: RoundsApi; round: ScoredRound }) {
  const [friends, setFriends] = useState<{ id: string; name: string }[] | null>(null);
  const [picking, setPicking] = useState(false);
  const [sending, setSending] = useState<string | null>(null);
  // By id: two friends without a name are both "A traveler" (review, 2026-11-19).
  const [sent, setSent] = useState<{ id: string; name: string }[]>([]);
  const [problem, setProblem] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    rounds.friends().then(
      (f) => live && setFriends(f),
      () => live && setFriends([]),
    );
    return () => {
      live = false;
    };
  }, [rounds]);

  const answered = round.recorded.answered;
  if (!answered && (!friends || friends.length === 0)) return null;

  const send = (f: { id: string; name: string }) => {
    setSending(f.id);
    setProblem(null);
    rounds.send(f.id, round.sessionId).then(
      () => {
        setSending(null);
        setSent((s) => [...s, f]);
      },
      (e: unknown) => {
        setSending(null);
        const p = e instanceof ChallengeError ? e.problem : 'failed';
        setProblem(PROBLEM[p](f.name));
      },
    );
  };

  return (
    <div className="challenge-offer">
      {answered && (
        <p className="challenge-offer__answered" role="status">
          You answered {answered.name}’s challenge: {answered.name} {answered.theirs}, you{' '}
          {round.score}. <Link href="/arena">See it in the Arena</Link>
        </p>
      )}
      {friends && friends.length > 0 && (
        <>
          {sent.length > 0 && (
            <p className="challenge-offer__sent" role="status">
              Sent to {sent.map((s) => s.name).join(' and ')}.
            </p>
          )}
          {problem && (
            <p className="challenge-offer__problem" role="alert">
              {problem}
            </p>
          )}
          {picking ? (
            <div className="challenge-offer__friends" role="group" aria-label="Challenge a friend">
              <p className="challenge-offer__ask">
                Who gets {ROUND_NAMES[round.kind]} to beat {round.score}?
              </p>
              {friends.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  className="lesson__plain"
                  disabled={sending !== null || sent.some((s) => s.id === f.id)}
                  onClick={() => send(f)}
                >
                  {sending === f.id ? 'Sending…' : f.name}
                </button>
              ))}
            </div>
          ) : (
            <button type="button" className="lesson__plain" onClick={() => setPicking(true)}>
              Challenge a friend with this score
            </button>
          )}
        </>
      )}
    </div>
  );
}
