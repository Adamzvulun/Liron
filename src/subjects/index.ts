// The registry of subjects. Adding a subject means adding a module and listing it here.
import type { SubjectInfo } from '../core/subject.ts';
import { arabic } from './arabic/index.ts';
import { morse } from './morse/index.ts';

export const subjects: readonly SubjectInfo[] = [morse, arabic];
