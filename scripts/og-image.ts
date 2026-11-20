// The link preview card (public/og-image.png): what WhatsApp, Messages and the like show under
// an invite link. It is the sign-in screen's own painting, the city gate at dusk
// (src/core/auth/Scenes.tsx), with the name and one line, at the 1200 × 630 the apps expect.
//
//   node scripts/og-image.ts
//
// Run it again when the gate's painting or the line changes, and look at the picture.
import { readFileSync, writeFileSync } from 'node:fs';
import { createElement, type ComponentType } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { chromium } from 'playwright';
import { createServer } from 'vite';

export const OG_LINE = 'Master real skills, one trial at a time';
const OUT = new URL('../public/og-image.png', import.meta.url);

const font = (path: string) =>
  `data:font/woff2;base64,${readFileSync(new URL(`../node_modules/${path}`, import.meta.url)).toString('base64')}`;

const vite = await createServer({
  server: { middlewareMode: true },
  appType: 'custom',
  logLevel: 'error',
});
// Loaded through Vite, which compiles the TSX this Node script can't.
const { GateScene } = (await vite.ssrLoadModule('/src/core/auth/Scenes.tsx')) as {
  GateScene: ComponentType;
};
const gate = renderToStaticMarkup(createElement(GateScene));
const scenesCss = readFileSync(new URL('../src/core/auth/scenes.css', import.meta.url), 'utf8');
await vite.close();

const html = `<!doctype html><html><head><meta charset="utf-8"><style>
@font-face { font-family: Cinzel; font-weight: 900; src: url(${font('@fontsource/cinzel/files/cinzel-latin-900-normal.woff2')}); }
@font-face { font-family: Alegreya Sans; font-weight: 700; src: url(${font('@fontsource/alegreya-sans/files/alegreya-sans-latin-700-normal.woff2')}); }
${scenesCss}
html, body { margin: 0; width: 1200px; height: 630px; overflow: hidden; background: #2b1a14; }
.scene { position: absolute !important; inset: 0; width: 100%; height: 100%; z-index: 0 !important; }
.scene * { animation: none !important; }
.card { position: absolute; inset: 0; z-index: 1; display: flex; flex-direction: column; align-items: center; padding-top: 70px;
  background: linear-gradient(#1a0f0acc 0%, #1a0f0a55 40%, transparent 60%); }
h1 { margin: 0; font: 900 120px/1 Cinzel, serif; letter-spacing: 0.04em; color: #ffd36b; text-shadow: 0 6px 0 #24160e; }
p { margin: 18px 0 0; font: 700 44px/1.1 'Alegreya Sans', sans-serif; color: #fff3c4; text-shadow: 0 3px 0 #24160e; }
</style></head><body>${gate}<div class="card"><h1>WAYMARK</h1><p>${OG_LINE}</p></div></body></html>`;

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1200, height: 630 } });
await page.setContent(html);
await page.evaluate(() => document.fonts.ready);
writeFileSync(OUT, await page.screenshot({ type: 'png' }));
await browser.close();
console.log(`Wrote ${OUT.pathname}`);
