import { useEffect, useRef, useState } from 'react';
import { Link } from '../Link.tsx';
import { PLACE_PATHS } from '../city/layout.ts';
import type { GuideChapter, SubjectInfo } from '../subject.ts';
import { fill } from './numbers.ts';
import { GUIDEBOOK } from './words.ts';
import './guidebook.css';

interface Page {
  id: string;
  title: string;
  text: string;
  href?: string;
  stations?: GuideChapter['stations'];
}

const PLACE_HREF = { ...PLACE_PATHS, arena: '/arena' } as const;

/** The platform's pages, then each guild's, in the order the city is met. */
function pagesOf(guilds: readonly { subject: SubjectInfo; chapter: GuideChapter }[]): Page[] {
  const own = GUIDEBOOK.chapters.map((c) => ({
    id: c.id,
    title: c.title,
    text: fill(c.text),
    ...(c.place && { href: PLACE_HREF[c.place] }),
  }));
  const halls = guilds.map(({ subject, chapter }) => ({
    id: `guild-${subject.id}`,
    title: chapter.title,
    text: chapter.text,
    stations: chapter.stations,
    ...(subject.building && { href: PLACE_PATHS[subject.building] }),
  }));
  // The way first, then the guilds (where a newcomer starts), then the rest of the city.
  return [...own.slice(0, 1), ...halls, ...own.slice(1)];
}

/**
 * The Guidebook (the-guide.md §3.5, R14–R17; #412): a page for every place, number and system,
 * opened from Settings or by tapping Nour. On a phone, the list of pages opens one at a time;
 * wider, the list and the page sit side by side.
 */
export function Guidebook({
  subjects,
  onTour,
}: {
  subjects: readonly SubjectInfo[];
  /** "Show me around again": back to the square, and the welcome once more. */
  onTour: () => void;
}) {
  const [guilds, setGuilds] = useState<{ subject: SubjectInfo; chapter: GuideChapter }[]>([]);
  useEffect(() => {
    let live = true;
    void Promise.all(
      subjects.flatMap((subject) =>
        subject.guidebook
          ? [
              subject.guidebook().then(
                (chapter) => ({ subject, chapter }),
                () => null,
              ),
            ]
          : [],
      ),
    ).then((found) => {
      if (live) setGuilds(found.filter((g) => g !== null));
    });
    return () => {
      live = false;
    };
  }, [subjects]);
  const pages = pagesOf(guilds);
  // Wide, the first page shows beside the list; on a phone, the list comes first.
  const [open, setOpen] = useState<string | null>(() =>
    window.matchMedia('(min-width: 720px)').matches ? (GUIDEBOOK.chapters[0]?.id ?? null) : null,
  );
  const page = pages.find((p) => p.id === open) ?? null;
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    document.title = `${GUIDEBOOK.title} – Waymark`;
    return () => {
      document.title = 'Waymark';
    };
  }, []);
  // A page the player chose takes the focus; the one open on arrival doesn't.
  const chosen = useRef(false);
  useEffect(() => {
    if (open && chosen.current) heading.current?.focus();
  }, [open]);
  return (
    <main className="place-screen place-screen--wide guidebook" data-ground="wood">
      <Link className="place-screen__back" href="/">
        ← Back to the square
      </Link>
      <h1 className="place-screen__title">{GUIDEBOOK.title}</h1>
      <div className="guidebook__book" data-open={page ? 'page' : 'list'}>
        <nav className="guidebook__contents" aria-label="Pages">
          <ul>
            {pages.map((p) => (
              <li key={p.id}>
                <button
                  type="button"
                  className="guidebook__entry"
                  aria-current={page?.id === p.id ? 'page' : undefined}
                  onClick={() => {
                    chosen.current = true;
                    setOpen(p.id);
                  }}
                >
                  {p.title}
                </button>
              </li>
            ))}
          </ul>
          <button type="button" className="guidebook__tour" onClick={onTour}>
            {GUIDEBOOK.tour}
          </button>
        </nav>
        {page && (
          <article className="guidebook__page" aria-labelledby="guidebook-page-title">
            <button type="button" className="guidebook__all" onClick={() => setOpen(null)}>
              ← All pages
            </button>
            <h2 id="guidebook-page-title" tabIndex={-1} ref={heading}>
              {page.title}
            </h2>
            <p>{page.text}</p>
            {page.stations && page.stations.length > 0 && (
              <dl className="guidebook__stations">
                {page.stations.map((s) => (
                  <div key={s.title}>
                    <dt>{s.title}</dt>
                    <dd>{s.text}</dd>
                  </div>
                ))}
              </dl>
            )}
            {page.href && (
              <Link className="guidebook__go" href={page.href}>
                {GUIDEBOOK.go}
              </Link>
            )}
          </article>
        )}
      </div>
    </main>
  );
}
