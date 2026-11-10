import { describe, expect, it, vi } from 'vitest';
import type { SubjectApi } from '../../../core/subject.ts';
import { NEW_PROGRESS } from '../progress.ts';
import { PAIRS, type PairQuestion } from './pairs.ts';
import { reportRound, reportShadow } from './report.ts';
import type { ShadowLine } from './shadow.ts';

const pair = PAIRS[0] ?? null;
const question = { kind: 'sound', pair, answer: 'a' } as unknown as PairQuestion;
const line = { itemId: 'shadow:pcav:0001' } as unknown as ShadowLine;

function fakeApi() {
  const saveSession = vi.fn(async (session: unknown) => void session);
  return { api: { saveSession } as unknown as SubjectApi, saveSession };
}

describe('the echo well’s events (#197)', () => {
  it('sends a round, and the pair once it is heard', async () => {
    const { api, saveSession } = fakeApi();
    await reportRound(api, NEW_PROGRESS, [{ question, right: true }], null, 60);
    expect(saveSession.mock.calls[0]?.[0]).toMatchObject({ events: [{ kind: 'pairs-round' }] });
    await reportRound(api, NEW_PROGRESS, [{ question, right: true }], pair, 60);
    expect(saveSession.mock.calls[1]?.[0]).toMatchObject({
      events: [{ kind: 'pairs-round' }, { kind: `heard-${pair?.id ?? ''}` }],
    });
  });

  it('counts the sentences shadowed', async () => {
    const { api, saveSession } = fakeApi();
    const judged = [
      { line, judgement: 'in-step' as const },
      { line, judgement: 'lost' as const },
    ];
    await reportShadow(api, NEW_PROGRESS, judged, 60);
    expect(saveSession.mock.calls[0]?.[0]).toMatchObject({
      events: [{ kind: 'shadow-sentence', count: 2 }],
    });
  });
});
