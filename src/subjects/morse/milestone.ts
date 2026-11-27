// Morse's part of the milestone check: its six statements and one Long Copy at your speed.
import { lazy } from 'react';
import pack from '../../../content/morse/milestone.json' with { type: 'json' };
import type { MilestoneKit } from '../../core/subject.ts';

export const kit: MilestoneKit = {
  statements: (pack.items[0]?.data as { statements: string[] }).statements,
  Probe: lazy(() => import('./MilestoneProbe.tsx').then((m) => ({ default: m.MilestoneProbe }))),
};
