import { z } from 'zod';
import page from '../../../content/core/first-page.json' with { type: 'json' };
import { Link } from '../Link.tsx';
import type { CompassLine } from './compass.ts';
import { rememberFirstPageClosed } from './firstPage.ts';
import { useDialogFocus } from './useDialogFocus.ts';
import './firstPage.css';

const Words = z.object({
  title: z.string().min(1),
  paragraphs: z.array(z.string().min(1)).min(1),
  later: z.string().min(1),
});
const words = Words.parse(page.items[0]?.data);

/**
 * The first page (docs/game/the-road.md §8): what this city is, shown over the square to a
 * player with no step done on any road, with one button per guild that goes straight to its
 * first step. The words are content; the buttons come from the guilds' own compass lines.
 */
export function FirstPage({
  guilds,
  onClose,
}: {
  guilds: readonly CompassLine[];
  onClose: () => void;
}) {
  const first = useDialogFocus<HTMLAnchorElement>();
  const close = () => {
    rememberFirstPageClosed();
    onClose();
  };
  const [main, ...others] = guilds;
  if (!main) return null;
  return (
    <div className="firstpage" role="presentation" onKeyDown={(e) => e.key === 'Escape' && close()}>
      <div
        className="firstpage__card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="firstpage-title"
      >
        <h1 id="firstpage-title" className="firstpage__title">
          {words.title}
        </h1>
        {words.paragraphs.map((p) => (
          <p key={p} className="firstpage__text">
            {p}
          </p>
        ))}
        <div className="firstpage__ways">
          <Link ref={first} className="firstpage__go" href={main.href} onClick={close}>
            {main.welcome ?? main.giver}
          </Link>
          {others.map((g) => (
            <Link key={g.subject} className="firstpage__other" href={g.href} onClick={close}>
              Or {lowerFirst(g.welcome ?? g.giver)}
            </Link>
          ))}
          <button type="button" className="firstpage__later" onClick={close}>
            {words.later}
          </button>
        </div>
      </div>
    </div>
  );
}

const lowerFirst = (s: string) => s.charAt(0).toLowerCase() + s.slice(1);
