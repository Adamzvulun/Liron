import { useEffect, useState } from 'react';
import type { Item } from '../../../core/content/schema.ts';
import type { SubjectApi } from '../../../core/subject.ts';
import { coreWordsFrom } from '../core/coreWords.ts';
import { Ar } from '../lesson/ScriptLesson.tsx';
import { seeded } from '../lesson/questions.ts';
import { useRecorder } from '../phrases/useRecorder.ts';
import type { ArabicProgress } from '../progress.ts';
import { reportShadow } from './report.ts';
import {
  applyShadow,
  shadowLines,
  shadowRound,
  SLOW_RATE,
  XP_PER_SENTENCE,
  type Judgement,
  type ShadowLine,
} from './shadow.ts';
import { usePlayer } from './usePlayer.ts';

type Judged = { line: ShadowLine; judgement: Judgement };
type Player = ReturnType<typeof usePlayer>;

const JUDGEMENTS: readonly { id: Judgement; label: string }[] = [
  { id: 'lost', label: 'Lost' },
  { id: 'close', label: 'Close' },
  { id: 'in-step', label: 'In step' },
];

const pct = (rate: number) => (rate < 1 ? `${Math.round(rate * 100)}%` : 'full speed');

/**
 * Shadowing (#194, E14): hear a short sentence, then speak along with the speaker while it plays
 * again, and listen back to yours, theirs, and both together. You judge how it went.
 */
export function Shadowing({
  api,
  items,
  progress,
  onSaved,
  onLeave,
}: {
  api: SubjectApi;
  items: readonly Item[];
  progress: ArabicProgress;
  onSaved: (next: ArabicProgress) => void;
  onLeave: () => void;
}) {
  const [lines, setLines] = useState<ShadowLine[] | null>(null);
  const [index, setIndex] = useState(0);
  const [judged, setJudged] = useState<Judged[]>([]);
  const [startedAt] = useState(() => performance.now());
  const [saveFailed, setSaveFailed] = useState(false);
  const player = usePlayer(api, lines?.map((l) => l.audio) ?? []);

  useEffect(() => {
    let live = true;
    const all = shadowLines(coreWordsFrom(items), new Set(progress.words.met));
    api.reviewStatus(all.map((l) => l.itemId)).then(
      (status) => {
        if (!live) return;
        const now = Date.now();
        const due = new Set(
          [...status].filter(([, s]) => s.due.getTime() <= now).map(([id]) => id),
        );
        setLines(shadowRound(all, due, new Set(status.keys()), seeded(now)));
      },
      () => live && setLines(shadowRound(all, new Set(), new Set(), seeded(Date.now()))),
    );
    return () => {
      live = false;
    };
    // A round's sentences are chosen once, when it opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [api, items]);

  if (!lines) return <p className="arabic__loading">Drawing water…</p>;
  if (lines.length === 0)
    return (
      <p className="lesson__card">
        No short sentences yet: the deck’s sentences haven’t been loaded into Waymark.
      </p>
    );

  const line = lines[index];
  if (!line) {
    return (
      <div className="lesson__card lesson__start">
        <p className="lesson__kicker">Shadowing · done</p>
        {saveFailed && (
          <p className="lesson__warning" role="alert">
            Your round couldn’t be saved. Check your connection and try again.
          </p>
        )}
        <p className="arabic__pct">{judged.length}</p>
        <p>
          {judged.length === 1 ? 'sentence' : 'sentences'} shadowed ·{' '}
          {judged.filter((j) => j.judgement === 'in-step').length} in step
        </p>
        <p className="arabic__xp">+{judged.length * XP_PER_SENTENCE} XP</p>
        <div className="lesson__actions">
          <button type="button" className="lesson__plain" onClick={onLeave}>
            Back to the well
          </button>
        </div>
      </div>
    );
  }

  const judge = (judgement: Judgement) => {
    player.stop();
    const all = [...judged, { line, judgement }];
    setJudged(all);
    setIndex(index + 1);
    if (index + 1 < lines.length) return;
    const next = applyShadow(progress, all.length);
    onSaved(next);
    reportShadow(api, next, all, (performance.now() - startedAt) / 1000).then(
      () => setSaveFailed(false),
      () => setSaveFailed(true),
    );
  };

  return (
    <ShadowCard
      key={line.itemId}
      line={line}
      index={index}
      count={lines.length}
      player={player}
      onJudged={judge}
    />
  );
}

function ShadowCard({
  line,
  index,
  count,
  player,
  onJudged,
}: {
  line: ShadowLine;
  index: number;
  count: number;
  player: Player;
  onJudged: (j: Judgement) => void;
}) {
  const rec = useRecorder();
  const [rate, setRate] = useState(SLOW_RATE);
  /** The speed of your last take, so "Together" plays the speaker at the same one. */
  const [takeRate, setTakeRate] = useState(SLOW_RATE);
  const [takes, setTakes] = useState(0);
  const [shadowing, setShadowing] = useState(false);
  const mic = rec.state !== 'unsupported' && rec.state !== 'denied';

  const shadow = async () => {
    setShadowing(true);
    if (mic) await rec.start();
    await player.play(line.audio, rate);
    rec.stop();
    setShadowing(false);
    setTakes((t) => t + 1);
    setTakeRate(rate);
    setRate(1);
  };

  return (
    <div className="lesson__card arabic__question echo__shadow">
      <p className="lesson__kicker">
        Shadowing · {index + 1} of {count}
      </p>
      <div className="arabic__bar" aria-hidden="true">
        <span style={{ width: `${(index / count) * 100}%` }} />
      </div>
      <Ar className="echo__sentence">{line.arabic}</Ar>
      <p className="echo__latin">{line.latin}</p>
      <p className="arabic__note">{line.english}</p>
      <div className="arabic__compare">
        <button
          type="button"
          className="lesson__plain"
          disabled={shadowing}
          onClick={() => void player.play(line.audio, rate)}
        >
          ▶ Hear it{rate < 1 ? ' (slower)' : ''}
        </button>
        {shadowing ? (
          <button type="button" className="lesson__go arabic__rec is-on" onClick={player.stop}>
            ■ Stop
          </button>
        ) : (
          <button type="button" className="lesson__go arabic__rec" onClick={() => void shadow()}>
            ● Shadow at {pct(rate)}
          </button>
        )}
      </div>
      {shadowing && (
        <p className="arabic__note" aria-live="polite">
          {mic ? 'Recording: speak along with the speaker.' : 'Speak along with the speaker.'}
        </p>
      )}
      {!shadowing && takes === 0 && (
        <p className="arabic__note">
          Hear it first. Then press Shadow and say it at the same time as the speaker, not after.
        </p>
      )}
      {!mic && (
        <p className="arabic__note">
          No microphone, so no recording: speak along anyway, and judge it by feel.
        </p>
      )}
      {rec.url && !shadowing && (
        <div className="arabic__compare" role="group" aria-label="Listen back">
          <button
            type="button"
            className="lesson__plain"
            onClick={() => void player.playMine(rec.url ?? '')}
          >
            ▶ You
          </button>
          <button
            type="button"
            className="lesson__plain"
            onClick={() => void player.play(line.audio, takeRate)}
          >
            ▶ Speaker
          </button>
          <button
            type="button"
            className="lesson__plain"
            onClick={() => void player.together(line.audio, takeRate, rec.url ?? '')}
          >
            ▶ Together
          </button>
        </div>
      )}
      {takes > 0 && !shadowing && (
        <>
          <p className="lesson__subtitle">How did it go?</p>
          <div className="lesson__actions" role="group" aria-label="How did it go?">
            {JUDGEMENTS.map((j) => (
              <button
                key={j.id}
                type="button"
                className={j.id === 'in-step' ? 'lesson__go' : 'lesson__plain'}
                onClick={() => onJudged(j.id)}
              >
                {j.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
