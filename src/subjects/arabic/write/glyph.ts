// The slate's shapes (#41): a letter, or a short word, drawn on a canvas and read onto the grid
// that trace.ts scores a hand's ink against. Shared by the slate and the finale (task 4.2).
import { gridFrom } from './trace.ts';

/** The pad's size in pixels, and the grid it is read onto. */
export const PAD = 320;
export const GRID = 64;
export const FONT = `700 ${Math.round(PAD * 0.78)}px "Noto Naskh Arabic"`;

/**
 * Draws a letter, or a short word as one glyph (the finale's stranger's name, task 4.2), on a
 * canvas the pad's size, filled, and reads it onto the grid.
 */
export function glyphGrid(letter: string) {
  const c = document.createElement('canvas');
  c.width = PAD;
  c.height = PAD;
  const g = c.getContext('2d');
  if (!g) return null;
  drawGlyph(g, letter, '#000');
  return gridFrom(g.getImageData(0, 0, PAD, PAD).data, PAD, PAD, GRID);
}

export function drawGlyph(g: CanvasRenderingContext2D, letter: string, color: string) {
  g.font = FONT;
  // A word wider than the pad is drawn smaller, to fit (a letter always fits).
  const wide = g.measureText(letter).width;
  if (wide > PAD * 0.86)
    g.font = `700 ${Math.round((PAD * 0.78 * PAD * 0.86) / wide)}px "Noto Naskh Arabic"`;
  g.textAlign = 'center';
  g.textBaseline = 'alphabetic';
  g.fillStyle = color;
  // Center the letter's own ink, since letters sit very differently on the line (ا, ن, ي).
  const m = g.measureText(letter);
  const up = m.actualBoundingBoxAscent || PAD * 0.4;
  const down = m.actualBoundingBoxDescent || 0;
  g.fillText(letter, PAD / 2, PAD / 2 + (up - down) / 2);
}
