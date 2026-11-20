import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { siteUrl } from '../vite.config.ts';

// The link preview card (scripts/og-image.ts): what a chat app shows under an invite link.
const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const meta = (key: string) =>
  new RegExp(`<meta\\s+(?:property|name)="${key}"\\s+content="([^"]*)"`).exec(html)?.[1];

describe('link preview', () => {
  it('names the page, says what it is and points at the card', () => {
    expect(meta('og:title')).toBe('Waymark');
    expect(meta('og:description')).toMatch(/Arabic and Morse code/);
    expect(meta('og:image')).toBe('%SITE%/og-image.png');
    expect(meta('twitter:card')).toBe('summary_large_image');
  });

  it('the card is a 1200 × 630 PNG, small enough for WhatsApp', () => {
    const png = readFileSync(new URL('../public/og-image.png', import.meta.url));
    expect(png.subarray(1, 4).toString()).toBe('PNG');
    expect([png.readUInt32BE(16), png.readUInt32BE(20)]).toEqual([1200, 630]);
    expect(png.length).toBeLessThan(300_000);
  });

  it('the card’s address is whole on Vercel and relative elsewhere', () => {
    expect(siteUrl({ VERCEL_PROJECT_PRODUCTION_URL: 'waymark.example' })).toBe(
      'https://waymark.example',
    );
    expect(siteUrl({})).toBe('');
  });
});
