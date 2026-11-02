import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { describe, expect, it } from 'vitest';

// ADR 0003: "No feature may depend on two subjects at once." ADR 0019 turns that into import
// rules, checked here on every test run:
//  1. A subject's files import only from their own folder, its own content/<id>/ folder,
//     src/core/ and packages.
//  2. Platform code (src/core/) never imports a particular subject. It may only use the registry
//     (src/subjects/index.ts), which lists them all.
//  3. Only the scheduler (src/core/srs/scheduler.ts) imports ts-fsrs (ADR 0022): subjects grade
//     answers through the contract and never talk to the library.
//  4. Nothing in src/ imports from sources/ or scripts/, so copyrighted material can't end up in
//     the site bundle (ADR 0011, 0023).
const SRC = join(import.meta.dirname, '..', 'src');
const SUBJECTS = join(SRC, 'subjects');
const CORE = join(SRC, 'core');
const CONTENT = join(SRC, '..', 'content');
const REGISTRY_FILES = new Set(['index.ts', 'registry.ts', 'subjects.test.ts']);

function sourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory()
      ? sourceFiles(join(dir, e.name))
      : /\.(ts|tsx)$/.test(e.name)
        ? [join(dir, e.name)]
        : [],
  );
}

const IMPORT = /(?:import|export)\s[^'"]*?from\s*['"]([^'"]+)['"]|import\s*\(?\s*['"]([^'"]+)['"]/g;

/** Package imports only one file may use. */
const ONLY_IN: Record<string, string> = { 'ts-fsrs': join('core', 'srs', 'scheduler.ts') };

const specifiers = (code: string) => [...code.matchAll(IMPORT)].map((m) => m[1] ?? m[2] ?? '');

/** Relative imports in `code`, resolved to absolute paths. */
export function localImports(file: string, code: string): string[] {
  return specifiers(code)
    .filter((spec) => spec.startsWith('.'))
    .map((spec) => resolve(dirname(file), spec));
}

/** The subject folder a path belongs to, or null if it isn't inside one. */
function subjectOf(path: string): string | null {
  const rel = relative(SUBJECTS, path);
  if (rel.startsWith('..')) return null;
  const parts = rel.split(sep);
  return parts.length > 1 ? parts[0] : null; // files directly in src/subjects/ are the registry
}

/** Broken rules for one file, as readable messages. */
export function violations(file: string, code: string): string[] {
  const out: string[] = [];
  for (const spec of specifiers(code)) {
    const allowed = ONLY_IN[spec];
    if (allowed && relative(SRC, file) !== allowed)
      out.push(`imports ${spec}; only ${allowed} may`);
  }
  for (const target of localImports(file, code)) {
    for (const banned of ['sources', 'scripts']) {
      if (target.startsWith(join(SRC, '..', banned) + sep)) {
        out.push(`imports ${relative(join(SRC, '..'), target)}; the site never imports ${banned}/`);
      }
    }
  }
  const own = subjectOf(file);
  for (const target of localImports(file, code)) {
    const name = relative(SRC, target);
    const other = subjectOf(target);
    if (own) {
      if (other && other !== own) out.push(`subject "${own}" imports subject "${other}" (${name})`);
      else if (
        !other &&
        !target.startsWith(CORE + sep) &&
        !target.startsWith(join(CONTENT, own) + sep)
      )
        out.push(`subject "${own}" imports ${name}, outside its folder and src/core/`);
    } else if (file.startsWith(CORE + sep) && other) {
      out.push(`platform file imports subject "${other}" directly (${name}); use the registry`);
    }
  }
  return out;
}

describe('subject boundaries', () => {
  it('holds for every file in src/', () => {
    const found = sourceFiles(SRC)
      .filter((f) => !(dirname(f) === SUBJECTS && REGISTRY_FILES.has(f.slice(SUBJECTS.length + 1))))
      .flatMap((f) =>
        violations(f, readFileSync(f, 'utf8')).map((v) => `${relative(SRC, f)}: ${v}`),
      );
    expect(found).toEqual([]);
  });

  it('catches a subject importing another subject', () => {
    const file = join(SUBJECTS, 'morse', 'drill.ts');
    expect(violations(file, `import { x } from '../arabic/words.ts';`)).toEqual([
      `subject "morse" imports subject "arabic" (${join('subjects', 'arabic', 'words.ts')})`,
    ]);
    expect(violations(file, `const m = await import('../arabic/index.ts');`)).toHaveLength(1);
    expect(violations(file, `import { subjects } from '../index.ts';`)).toHaveLength(1);
    expect(violations(file, `import type { SubjectApi } from '../../core/subject.ts';`)).toEqual(
      [],
    );
    expect(violations(file, `import { y } from './sounds.ts';`)).toEqual([]);
    expect(violations(file, `import c from '../../../content/morse/characters.json';`)).toEqual([]);
    expect(violations(file, `import l from '../../../content/arabic/letters.json';`)).toHaveLength(
      1,
    );
  });

  it('catches anything but the scheduler importing ts-fsrs', () => {
    const subject = join(SUBJECTS, 'morse', 'drill.ts');
    expect(violations(subject, `import { fsrs } from 'ts-fsrs';`)).toHaveLength(1);
    expect(violations(join(CORE, 'App.tsx'), `import { fsrs } from 'ts-fsrs';`)).toHaveLength(1);
    expect(
      violations(join(CORE, 'srs', 'scheduler.ts'), `import { fsrs } from 'ts-fsrs';`),
    ).toEqual([]);
  });

  it('catches site code importing sources/ or scripts/', () => {
    const file = join(CORE, 'content', 'x.ts');
    expect(violations(file, `import d from '../../../sources/arabic/deck.json';`)).toHaveLength(1);
    expect(
      violations(file, `import { b } from '../../../scripts/content/lingualism.ts';`),
    ).toHaveLength(1);
  });

  it('catches platform code importing a particular subject', () => {
    const file = join(CORE, 'Lobby.tsx');
    expect(violations(file, `import { morse } from '../subjects/morse/index.ts';`)).toHaveLength(1);
    expect(violations(file, `import { subjects } from '../subjects/index.ts';`)).toEqual([]);
  });
});
