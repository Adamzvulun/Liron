import { lazy } from 'react';
import type { SubjectInfo } from '../../core/subject.ts';
// The hall loads when you enter it, so the square doesn't wait for it (#124).
const Caravanserai = lazy(() =>
  import('./Caravanserai.tsx').then((m) => ({ default: m.Caravanserai })),
);

export const arabic: SubjectInfo = {
  id: 'arabic',
  place: 'Caravanserai',
  tagline: 'Spoken Palestinian Arabic',
  guildColor: 'var(--guild-arabic)',
  building: 'caravanserai',
  quest: { text: 'The Long Road In I:', script: { text: 'ا ب ت ن ي', lang: 'ar', dir: 'rtl' } },
  questStatus: (state) => import('./tracker.ts').then((m) => m.questlineStatus(state)),
  skills: ['listen', 'read', 'write', 'speak'],
  Hall: Caravanserai,
};
