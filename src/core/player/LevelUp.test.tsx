import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { LevelUp } from './LevelUp.tsx';

const award = {
  xp: 140,
  gold: 98,
  gems: 1,
  xpEarned: 140,
  goldEarned: 98,
  gemsEarned: 1,
  levelBefore: 1,
  level: 5,
};

describe('LevelUp', () => {
  it('shows the new level, a new title and what was earned', () => {
    const html = renderToStaticMarkup(<LevelUp award={award} onDone={() => {}} />);
    expect(html).toContain('Level 5');
    expect(html).toContain('You are now an <strong>Adventurer</strong>');
    expect(html).toContain('+98 gold');
    expect(html).toContain('+1 gem');
    expect(html).toContain('role="dialog"');
  });

  it('leaves out the title and gems when they did not change', () => {
    const html = renderToStaticMarkup(
      <LevelUp award={{ ...award, levelBefore: 2, level: 3, gemsEarned: 0 }} onDone={() => {}} />,
    );
    expect(html).not.toContain('You are now');
    expect(html).not.toContain('gem');
  });
});
