import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { HallBackdrop } from './HallBackdrop.tsx';

describe("a hall's backdrop behind its stations (roadmap A1)", () => {
  it('paints the room once into a still image, hidden from screen readers', () => {
    const paint = vi.fn(() => '<rect width="10" height="10"/>');
    const once = renderToStaticMarkup(
      <HallBackdrop id="test" width={10} height={10} paint={paint} />,
    );
    const again = renderToStaticMarkup(
      <HallBackdrop id="test" width={10} height={10} paint={paint} />,
    );
    expect(paint).toHaveBeenCalledTimes(1);
    expect(once).toBe(again);
    expect(once).toContain('aria-hidden="true"');
    expect(once).toContain('alt=""');
    expect(once).toMatch(/<img src="(blob:|data:image\/svg\+xml)/);
  });
});
