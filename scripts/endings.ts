// The prepared test account for v3.0's release checklist (VERSIONS.md, "Reaching the endings"):
// saved progress that stands one step before each finale, so Adam can reach both endings on the
// dev site without playing a year. It prints SQL for the DEV project's SQL editor; it connects to
// nothing and needs no key. `tests/endings.test.ts` proves each state's compass points at its
// finale.
//
//   node scripts/endings.ts someone@example.com > endings.sql
//
// Then paste endings.sql into Supabase → SQL editor on the dev project (never the live one). It
// replaces that account's Morse and Arabic progress.
import { MORSE_CHARS } from '../src/subjects/morse/code.ts';
import { LETTERS, LESSON_COUNT } from '../src/subjects/arabic/letters.ts';
import { PAIRS } from '../src/subjects/arabic/echo/pairs.ts';
import { WORD_CHAPTERS } from '../src/subjects/arabic/core/wordChapters.ts';
import { REGULARS } from '../src/subjects/arabic/questline.ts';
import { SLATE_IDS } from '../src/subjects/arabic/ranks.ts';
import { PHRASE_SETS } from '../src/subjects/arabic/phrases/sets.ts';

/** A Ghost of the Ether with every step of the Silent Beacon done but Forty Winters. */
export const MORSE_BEFORE_FINALE = {
  unlocked: MORSE_CHARS.length,
  met: MORSE_CHARS.map((c) => c.char),
  trials: [1, 2, 3, 4, 5],
  ranks: ['listener', 'keyer', 'operator', 'telegraphist', 'signal-master', 'ghost'],
  rankTrials: ['lamp-signal', 'far-station', 'night-watch'],
  sending: { drills: 40, ditMs: 40, fastest: 40 },
  runs: 60,
  prosigns: ['prosign:ar', 'prosign:sk', 'prosign:bt', 'prosign:kn'],
  recognition: { best: 30, rounds: 5, avgMs: {} },
  words: { rounds: 12, best: 10 },
  rush: { runs: 5, best: 20, topWpm: 30 },
  radio: { call: 'W1AW', name: 'TEST', qth: 'DEV', contacts: 10, cleanFast: true },
};

/** A Storyteller with every step of the Long Road In done but The Stranger at the Gate. */
export const ARABIC_BEFORE_FINALE = {
  lesson: LESSON_COUNT,
  done: true,
  sessions: 40,
  guest: true,
  met: LETTERS.map((l) => l.id),
  written: [...SLATE_IDS],
  phraseSet: PHRASE_SETS.length + 1,
  ranks: ['guest', 'traveler', 'neighbor', 'friend', 'local', 'storyteller'],
  only: { listen: 1, read: 1 },
  echo: { heard: PAIRS.map((p) => p.id), shadowed: 5 },
  words: {
    chapter: WORD_CHAPTERS.length,
    done: true,
    sessions: 300,
    met: WORD_CHAPTERS.flatMap((c) => c.words.map((w) => w.deck)),
    trials: REGULARS.map((r) => r.number),
  },
  chat: { chats: 25, best: 8, met: { 2: 5, 3: 5, 4: 5, 5: 5, 6: 5 }, name: 'Tester' },
};

const quote = (s: string) => `'${s.replaceAll("'", "''")}'`;

export function endingsSql(email: string): string {
  const row = (subject: string, state: object) =>
    `insert into public.subject_progress (user_id, subject_id, state)
  select id, ${quote(subject)}, ${quote(JSON.stringify(state))}::jsonb from auth.users
  where email = ${quote(email)}
on conflict (user_id, subject_id) do update set state = excluded.state;`;
  return `-- Waymark, v3.0's release checklist: one step before each finale. DEV PROJECT ONLY.
-- Replaces the Morse and Arabic progress of ${email}.
begin;
${row('morse', MORSE_BEFORE_FINALE)}
${row('arabic', ARABIC_BEFORE_FINALE)}
commit;
`;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const email = process.argv[2];
  if (!email?.includes('@')) {
    console.error('Usage: node scripts/endings.ts someone@example.com > endings.sql');
    process.exit(1);
  }
  process.stdout.write(endingsSql(email));
}
