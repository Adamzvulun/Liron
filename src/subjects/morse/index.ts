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
  quest: { text: 'The Silent Beacon, Chapter 1: hear K and M' },
  welcome: 'Climb the Signal Tower',
  road: (state, ctx) => import('./road.ts').then((m) => m.morseRoad(state, ctx)),
  ledger: (state, look) => import('./ledger.ts').then((m) => m.morseLedger(state, look)),
  milestone: () => import('./milestone.ts').then((m) => m.kit),
  guidebook: () => import('./guide.ts').then((m) => m.chapter()),
  skills: ['receive', 'send', 'head-copy'],
  Hall: TowerHall,
};
