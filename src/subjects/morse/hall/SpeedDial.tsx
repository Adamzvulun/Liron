import { SPEEDS, charWpmOf, topSpeed, type MorseProgress } from '../lesson/progress.ts';

/**
 * Your speed, at the Signal Tower (ADR 0003: a subject keeps its own settings). Down to 18 any
 * time, up only to what the ladder has opened; Auto follows the ladder.
 */
export function SpeedDial({
  progress,
  onPick,
}: {
  progress: MorseProgress;
  onPick: (override: number | null) => void;
}) {
  const top = topSpeed(progress);
  const now = charWpmOf(progress);
  return (
    <div className="tower__dial" role="group" aria-label="Letter speed in words per minute">
      {SPEEDS.filter((s) => s <= top).map((s) => (
        <button
          key={s}
          type="button"
          aria-pressed={progress.override !== null && now === s}
          onClick={() => onPick(s)}
        >
          {s}
        </button>
      ))}
      <button type="button" aria-pressed={progress.override === null} onClick={() => onPick(null)}>
        Auto
      </button>
      <span className="tower__dial-note">Letters at {now} wpm</span>
    </div>
  );
}
