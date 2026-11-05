import type { SubjectInfo } from '../../core/subject.ts';
import { TowerHall } from './TowerHall.tsx';

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
