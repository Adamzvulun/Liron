import type { SubjectInfo } from '../../core/subject.ts';
import { Caravanserai } from './Caravanserai.tsx';

export const arabic: SubjectInfo = {
  id: 'arabic',
  place: 'Caravanserai',
  tagline: 'Spoken Palestinian Arabic',
  guildColor: 'var(--guild-arabic)',
  building: 'caravanserai',
  quest: { text: 'The Long Road In I:', script: { text: 'ا ب ت ن ي', lang: 'ar', dir: 'rtl' } },
  skills: ['listen', 'read', 'write', 'speak'],
  Hall: Caravanserai,
};
