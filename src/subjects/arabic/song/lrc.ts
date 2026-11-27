export interface LrcLine {
  /** Start, in seconds. */
  time: number;
  text: string;
}

const TIME = /^(?:(\d+):)?([0-5]?\d):([0-5]\d(?:\.\d+)?)$/;

/** Reads `MM:SS.s` or `H:MM:SS.s` as seconds; null for anything else (a bare "107" included). */
export function parseTime(text: string): number | null {
  const m = TIME.exec(text.trim());
  return m ? Number(m[1] ?? 0) * 3600 + Number(m[2]) * 60 + Number(m[3]) : null;
}

/** LRCLIB's synced lyrics: `[mm:ss.xx] text`, one or more stamps per line; tags like `[ar:…]` and empty lines are dropped. */
export function parseLrc(lrc: string): LrcLine[] {
  const out: LrcLine[] = [];
  for (const row of lrc.split(/\r?\n/)) {
    const m = /^((?:\[\d+:\d+(?:\.\d+)?\])+)(.*)$/.exec(row.trim());
    const text = m?.[2]?.trim();
    if (!m?.[1] || !text) continue;
    for (const [, stamp] of m[1].matchAll(/\[(\d+:\d+(?:\.\d+)?)\]/g)) {
      const time = parseTime(stamp ?? '');
      if (time !== null) out.push({ time, text });
    }
  }
  return out.sort((a, b) => a.time - b.time);
}

export interface TimedLine {
  start: number;
  end: number;
  text: string;
}

/** The singer's lines with `MM:SS.s` text times. Null when a time is unreadable, goes backwards or passes the video's length, so the caller can retry. */
export function parseSung(
  rows: readonly { start: string; end: string; text: string }[],
  duration: number,
): TimedLine[] | null {
  const out: TimedLine[] = [];
  let last = 0;
  for (const r of rows) {
    const start = parseTime(r.start);
    const end = parseTime(r.end);
    if (start === null || end === null || start < last || end < start || !(end <= duration))
      return null;
    out.push({ start, end, text: r.text });
    last = start;
  }
  return out;
}
