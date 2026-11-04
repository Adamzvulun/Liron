import type { SubjectInfo } from '../../core/subject.ts';
import { Caravanserai } from './Caravanserai.tsx';

export const arabic: SubjectInfo = {
  id: 'arabic',
  place: 'Caravanserai',
  tagline: 'Spoken Palestinian Arabic',
  guildColor: 'var(--guild-arabic)',
  skills: ['listen', 'read', 'write', 'speak'],
  Hall: Caravanserai,
};
