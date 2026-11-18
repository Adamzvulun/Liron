import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { PHONE_SPECS } from '../playwright.config.ts';

// On a PR into dev, CI runs only PHONE_SPECS on the phone (playwright.config.ts). A spec with
// steps of its own for the phone, or that measures the screen, must be on that list, or its
// phone half would quietly stop running until the next release PR.
const dir = join(import.meta.dirname, 'e2e');
const specs = readdirSync(dir).filter((f) => f.endsWith('.spec.ts'));
const PHONE_ONLY = /onPhone|project\.name|isMobile|viewport|setViewportSize|touchscreen|\.tap\(/;

describe('the phone specs (CI)', () => {
  it('lists every spec with phone-only steps', () => {
    const phoneMinded = specs
      .filter((f) => PHONE_ONLY.test(readFileSync(join(dir, f), 'utf8')))
      .map((f) => f.replace(/\.spec\.ts$/, ''));
    expect(phoneMinded.filter((name) => !PHONE_SPECS.includes(name))).toEqual([]);
  });

  it('names only specs that exist', () => {
    expect(PHONE_SPECS.filter((name) => !specs.includes(`${name}.spec.ts`))).toEqual([]);
  });
});
