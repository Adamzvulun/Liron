// The milestone check (docs/game/milestone-check.md): when the compass offers it, and how a check
// is scored. The statements and the probe belong to each subject (SubjectInfo.milestone).
import { addDays } from '../progress/economy.ts';
import { BOARD_COLOR, type CompassLine } from '../player/compass.ts';

/** The check is offered every 4 weeks, and not again for 7 days once it was offered. */
export const EVERY_DAYS = 28;
export const OFFER_AGAIN_DAYS = 7;
export const STATEMENTS = 6;

/** Can-do answers, as saved: 0 not yet, 1 with help, 2 yes. */
export const ANSWERS = ['Not yet', 'With help', 'Yes'] as const;

/**
 * Is it time to offer the check? `anchor` is the last check's day, or for a first check the
 * player's first day with any practice. `offeredOn` is when the compass last offered it.
 */
export function milestoneDue(p: {
  today: string;
  anchor: string | null;
  offeredOn: string | null;
}): boolean {
  if (!p.anchor || p.today < addDays(p.anchor, EVERY_DAYS)) return false;
  return !p.offeredOn || p.today >= addDays(p.offeredOn, OFFER_AGAIN_DAYS);
}

/** The can-do answers as a percent: all "yes" is 100. */
export const canDoPercent = (answers: readonly number[]) =>
  answers.length === 0
    ? 0
    : Math.round((100 * answers.reduce((a, b) => a + b, 0)) / (2 * answers.length));

/** A probe's score in percent, or null when there was nothing to ask. */
export const probePercent = (right: number, asked: number) =>
  asked > 0 ? Math.round((100 * right) / asked) : null;

/** What the compass says when the check is due. */
export const milestoneErrand = (): CompassLine => ({
  subject: 'errand:milestone',
  giver: 'Your House',
  color: BOARD_COLOR,
  href: '/house#ledger',
  text: 'It’s been four weeks: take the milestone check, beside your ledger.',
  quiet: false,
  started: true,
});

const OFFERED = 'waymark:milestone-offered';

/** The day the check was last offered on this device. */
export function offeredOn(): string | null {
  try {
    return localStorage.getItem(OFFERED);
  } catch {
    return null;
  }
}

export function rememberOffered(day: string) {
  try {
    localStorage.setItem(OFFERED, day);
  } catch {
    // Without storage it is offered again on the next visit: a nudge, not a loss.
  }
}
