import { describe, expect, it } from 'vitest';
import { paintCity } from './painter.js';

describe('the painted square', () => {
  it('defines every gradient and filter it uses (review, 2026-11-19)', () => {
    const city = paintCity();
    const markup = JSON.stringify(city);
    const ids = new Set([...city.defs.matchAll(/id="([^"]+)"/g)].map((m) => m[1]));
    const used = new Set([...markup.matchAll(/url\(#([^)]+)\)/g)].map((m) => m[1] ?? ''));
    // Filters (fx-…) live in the page's own <defs>, not the painter's.
    expect([...used].filter((id) => !id.startsWith('fx-') && !ids.has(id))).toEqual([]);
  });
});
