import { useEffect, useRef, useState } from 'react';
import type { SubjectApi } from '../../../core/subject.ts';
import { lettersUpTo, LESSONS, type Letter } from '../letters.ts';
import { parseProgress, type ArabicProgress } from '../progress.ts';
import { seeded } from '../lesson/questions.ts';
import { dilate, FREE_PASS, gridFrom, scoreTrace, TRACE_PASS, type TraceScore } from './trace.ts';

/** Letters in a slate session; each is traced, then written from memory. */
export const SLATE_LETTERS = 5;
const PAD = 320;
const GRID = 64;
const FONT = `700 ${Math.round(PAD * 0.78)}px "Noto Naskh Arabic"`;
const INK = 22;

type Step = 'trace' | 'free';
interface Attempt {
  letter: Letter;
  step: Step;
  score: TraceScore;
}

/** The letters you've met, the newest lesson's first, in a shuffled order. */
function slateLetters(p: ArabicProgress, seed: number): Letter[] {
  const rand = seeded(seed);
  const met = lettersUpTo(p.done ? LESSONS.length : p.lesson).filter(
    (l) => p.met.includes(l.id) && l.letter.length === 1,
  );
  const newest = met.filter((l) => l.lesson === Math.max(...met.map((m) => m.lesson)));
  const rest = met.filter((l) => !newest.includes(l));
  const mix = <T,>(a: T[]) => a.map((x) => [rand(), x] as const).sort((x, y) => x[0] - y[0]);
  return [...mix(newest), ...mix(rest)].map(([, l]) => l).slice(0, SLATE_LETTERS);
}

/** Draws a letter on a canvas the pad's size, filled, and reads it onto the grid. */
function letterGrid(letter: string) {
  const c = document.createElement('canvas');
  c.width = PAD;
  c.height = PAD;
  const g = c.getContext('2d');
  if (!g) return null;
  drawGlyph(g, letter, '#000');
  return gridFrom(g.getImageData(0, 0, PAD, PAD).data, PAD, PAD, GRID);
}

function drawGlyph(g: CanvasRenderingContext2D, letter: string, color: string) {
  g.font = FONT;
  g.textAlign = 'center';
  g.textBaseline = 'alphabetic';
  g.fillStyle = color;
  // Centre the letter's own ink, since letters sit very differently on the line (ا, ن, ي).
  const m = g.measureText(letter);
  const up = m.actualBoundingBoxAscent || PAD * 0.4;
  const down = m.actualBoundingBoxDescent || 0;
  g.fillText(letter, PAD / 2, PAD / 2 + (up - down) / 2);
}

/**
 * The slate (#41): trace a letter you know over a faint guide, then write it from memory.
 * A rough shape check, not handwriting recognition: no stroke order, a margin for a shaky hand.
 */

/** Writing is slow: 4 XP per good shape keeps the slate near 10 XP a minute (2026-11-04 review). */
const XP_PER_SHAPE = 4;
export function Slate({ api }: { api: SubjectApi }) {
  const [progress, setProgress] = useState<ArabicProgress | null>(null);
  const [failed, setFailed] = useState(false);
  const [letters, setLetters] = useState<Letter[]>([]);
  const [index, setIndex] = useState(0);
  const [step, setStep] = useState<Step>('trace');
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [score, setScore] = useState<TraceScore | null>(null);
  const [started] = useState(() => Date.now());
  const [saved, setSaved] = useState<'no' | 'yes' | 'failed'>('no');

  useEffect(() => {
    let live = true;
    api.loadState().then(
      (s) => {
        if (!live) return;
        const p = parseProgress(s);
        setProgress(p);
        setLetters(slateLetters(p, Date.now()));
      },
      () => live && setFailed(true),
    );
    return () => {
      live = false;
    };
  }, [api]);

  if (failed)
    return (
      <p className="lesson__card">
        The inn’s ledger couldn’t be read. Check your connection and reload the page.
      </p>
    );
  if (!progress) return <p className="arabic__loading">Lighting the lamps…</p>;
  if (!letters.length)
    return (
      <p className="lesson__card">
        Meet your first letters at the scribe’s table, then come back to the slate.
      </p>
    );

  const done = index >= letters.length;
  const letter = letters[index];

  const finish = (all: Attempt[]) => {
    const byLetter = new Map<string, number>();
    for (const a of all) {
      const now = byLetter.get(a.letter.id) ?? 0;
      byLetter.set(a.letter.id, now + (a.score.passed ? (a.step === 'free' ? 0.6 : 0.4) : 0));
    }
    const at = new Date();
    (async () => {
      for (const [id, s] of byLetter) await api.recordResult('write', id, s, { at });
      const xp = all.filter((a) => a.score.passed).length * XP_PER_SHAPE;
      if (xp > 0) await api.awardXP(xp);
      await api.recordPractice((Date.now() - started) / 60000);
    })().then(
      () => setSaved('yes'),
      () => setSaved('failed'),
    );
  };

  const next = () => {
    if (!letter || !score) return;
    const all = [...attempts, { letter, step, score }];
    setAttempts(all);
    setScore(null);
    if (step === 'trace') setStep('free');
    else {
      setStep('trace');
      setIndex(index + 1);
      if (index + 1 >= letters.length) finish(all);
    }
  };

  return (
    <section className="lesson arabic" aria-label="The slate">
      {saved === 'failed' && (
        <p className="lesson__warning" role="alert">
          Your writing couldn’t be saved. Check your connection and try again.
        </p>
      )}
      {!done && letter && (
        <div className="lesson__card arabic__slate">
          <p className="lesson__kicker">
            The slate · letter {index + 1} of {letters.length} ·{' '}
            {step === 'trace' ? 'trace it' : 'from memory'}
          </p>
          <h2 className="lesson__subtitle">
            {step === 'trace' ? 'Trace the letter' : 'Now write it without the guide'}
          </h2>
          <p className="arabic__bridge">
            <bdi lang="ar" dir="rtl" className="arabic__slate-model">
              {letter.letter}
            </bdi>{' '}
            · {letter.nameLatin} · like <bdi lang="he">{letter.hebrew}</bdi>
          </p>
          <Pad
            key={`${letter.id}-${step}`}
            letter={letter.letter}
            guide={step === 'trace'}
            score={score}
            onCheck={(ink) => {
              const shape = letterGrid(letter.letter);
              if (!shape) return;
              setScore(
                scoreTrace(shape, dilate(shape, 4), ink, step === 'trace' ? TRACE_PASS : FREE_PASS),
              );
            }}
            onClear={() => setScore(null)}
          />
          {score && (
            <div className="arabic__feedback" aria-live="polite">
              <p className={score.passed ? 'arabic__good' : 'arabic__bad'}>
                {score.passed
                  ? 'Good shape!'
                  : score.dots < 1
                    ? 'Don’t forget the dots.'
                    : score.coverage < (step === 'trace' ? TRACE_PASS : FREE_PASS).coverage
                      ? 'Some of the letter is missing.'
                      : 'Too much ink outside the letter.'}
              </p>
              <button type="button" className="lesson__go" onClick={next} autoFocus>
                Next
              </button>
            </div>
          )}
        </div>
      )}
      {done && (
        <div className="lesson__card lesson__start">
          <p className="lesson__kicker">The slate · done</p>
          <p className="arabic__pct">
            {attempts.filter((a) => a.score.passed).length} / {attempts.length}
          </p>
          <p>Shapes that looked right. Writing helps the letters stick when you read.</p>
          <p className="arabic__xp">
            +{attempts.filter((a) => a.score.passed).length * XP_PER_SHAPE} XP
          </p>
        </div>
      )}
    </section>
  );
}

/** The drawing pad: a faint guide letter (when tracing) and your ink. */
function Pad({
  letter,
  guide,
  score,
  onCheck,
  onClear,
}: {
  letter: string;
  guide: boolean;
  score: TraceScore | null;
  onCheck: (ink: ReturnType<typeof gridFrom>) => void;
  onClear: () => void;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  const inkRef = useRef<HTMLCanvasElement | null>(null);
  const drawing = useRef<{ x: number; y: number } | null>(null);
  const [inked, setInked] = useState(false);

  // The ink lives on its own canvas at the pad's size, so the check never sees the guide.
  const ink = () => {
    if (!inkRef.current) {
      const c = document.createElement('canvas');
      c.width = PAD;
      c.height = PAD;
      inkRef.current = c;
    }
    return inkRef.current;
  };

  const paint = () => {
    const c = ref.current;
    const g = c?.getContext('2d');
    if (!c || !g) return;
    g.clearRect(0, 0, PAD, PAD);
    if (guide || score)
      drawGlyph(g, letter, score ? 'rgba(46,143,90,0.35)' : 'rgba(42,23,12,0.16)');
    g.drawImage(ink(), 0, 0);
  };

  useEffect(() => {
    let live = true;
    document.fonts.load(FONT, letter).then(
      () => live && paint(),
      () => live && paint(),
    );
    return () => {
      live = false;
    };
  });

  const at = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    return { x: ((e.clientX - r.left) * PAD) / r.width, y: ((e.clientY - r.top) * PAD) / r.height };
  };
  const stroke = (from: { x: number; y: number }, to: { x: number; y: number }) => {
    const g = ink().getContext('2d');
    if (!g) return;
    g.strokeStyle = '#2a170c';
    g.lineWidth = INK;
    g.lineCap = 'round';
    g.lineJoin = 'round';
    g.beginPath();
    g.moveTo(from.x, from.y);
    g.lineTo(to.x, to.y);
    g.stroke();
    paint();
  };

  return (
    <div className="arabic__pad-wrap">
      <canvas
        ref={ref}
        className="arabic__pad"
        width={PAD}
        height={PAD}
        aria-label={guide ? 'Trace the letter here' : 'Write the letter here'}
        onPointerDown={(e) => {
          if (score) return;
          e.currentTarget.setPointerCapture(e.pointerId);
          const p = at(e);
          drawing.current = p;
          stroke(p, p);
          setInked(true);
        }}
        onPointerMove={(e) => {
          if (!drawing.current) return;
          const p = at(e);
          stroke(drawing.current, p);
          drawing.current = p;
        }}
        onPointerUp={() => (drawing.current = null)}
        onPointerCancel={() => (drawing.current = null)}
      />
      <div className="lesson__actions">
        <button
          type="button"
          className="lesson__plain"
          onClick={() => {
            ink().getContext('2d')?.clearRect(0, 0, PAD, PAD);
            setInked(false);
            onClear();
            paint();
          }}
        >
          Clear
        </button>
        {!score && (
          <button
            type="button"
            className="lesson__go"
            disabled={!inked}
            onClick={() => {
              const g = ink().getContext('2d');
              if (g) onCheck(gridFrom(g.getImageData(0, 0, PAD, PAD).data, PAD, PAD, GRID));
            }}
          >
            Check
          </button>
        )}
      </div>
    </div>
  );
}
