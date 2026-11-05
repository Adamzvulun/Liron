import { lazy } from 'react';
import type { SubjectInfo } from '../../core/subject.ts';
// The hall loads when you enter it, so the square doesn't wait for it (#124).
const TowerHall = lazy(() => import('./TowerHall.tsx').then((m) => ({ default: m.TowerHall })));

export const morse: SubjectInfo = {
  id: 'morse',
  place: 'Signal Tower',
  tagline: 'Morse code by sound and light',
  guildColor: 'var(--guild-morse)',
  building: 'tower',
  quest: { text: 'The Silent Beacon I: hear K and M' },
  skills: ['receive', 'send', 'head-copy'],
  Hall: TowerHall,
};
