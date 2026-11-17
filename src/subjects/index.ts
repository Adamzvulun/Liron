// The registry of subjects. Adding a subject means adding its folder and listing it here;
// no platform code changes (ADR 0019). Start from src/subjects/example/.
import { arabic } from './arabic/index.ts';
import { morse } from './morse/index.ts';
import { defineSubjects } from './registry.ts';

export const subjects = defineSubjects([morse, arabic]);
