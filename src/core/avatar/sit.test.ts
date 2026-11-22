import { describe, expect, it } from 'vitest';
import { DEFAULT_LOOK, type Look } from './looks.ts';
import { paintAvatar, paintCompanion } from './paint.ts';

// Sitting down in your room, and the companion drawn on its own (tasks 7.5 and 7.6).
const cloaked: Look = {
  ...DEFAULT_LOOK,
  gear: { ...DEFAULT_LOOK.gear, back: 'cloak', pet: 'sand-cat' },
};

describe('the sitting pose', () => {
  it('drops the body to the seat and draws the knees over the lap', () => {
    const standing = paintAvatar(cloaked, { idPrefix: 'a' });
    const sitting = paintAvatar(cloaked, { idPrefix: 'a', sit: true });
    expect(sitting).not.toBe(standing);
    expect(sitting).toContain('translate(0 44)');
    // Only the shins and feet of the standing legs, and the cloak clipped at the seat.
    expect(sitting).toContain('<clipPath id="a-sit">');
    expect(sitting).toContain('<clipPath id="a-seat">');
    expect(sitting).not.toMatch(/NaN|undefined/);
  });

  it('keeps each avatar’s clip paths its own', () => {
    expect(paintAvatar(cloaked, { idPrefix: 'b', sit: true })).toContain('id="b-sit"');
  });
});

describe('the companion on its own', () => {
  it('can be left off the avatar and drawn alone', () => {
    const without = paintAvatar(cloaked, { idPrefix: 'a', pet: false });
    expect(without).not.toBe(paintAvatar(cloaked, { idPrefix: 'a' }));
    expect(paintCompanion(cloaked, 'p')).toContain('<g transform="translate(100 300)');
    expect(paintCompanion(DEFAULT_LOOK, 'p')).toBe('');
  });
});
