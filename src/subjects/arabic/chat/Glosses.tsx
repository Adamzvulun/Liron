import { glossesIn, type Glossary } from './innChat.ts';

/** The words of a line that you've met, each with our gloss; nothing when there are none. */
export function Glosses({ line, glossary }: { line: string; glossary: Glossary }) {
  const found = glossesIn(line, glossary);
  if (!found.length) return null;
  return (
    <span className="arabic__bubble-glosses">
      {found.map((g) => (
        <span key={g.word}>
          <span lang="ar" dir="rtl">
            {g.word}
          </span>{' '}
          {g.gloss}
        </span>
      ))}
    </span>
  );
}
