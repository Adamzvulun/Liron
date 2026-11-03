import type { SubjectInfo } from '../../core/subject.ts';
import { KochLesson } from './lesson/Lesson.tsx';

export const morse: SubjectInfo = {
  id: 'morse',
  place: 'Signal Tower',
  tagline: 'Morse code by sound and light',
  guildColor: 'var(--guild-morse)',
  skills: ['receive', 'send', 'head-copy'],
  Hall: KochLesson,
};
