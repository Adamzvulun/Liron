import { useEffect, useState } from 'react';
import { NOTES, noteById, type Note } from '../home/notes.ts';
import { dayLabel, type FellowshipSource, type LetterNote } from './fellowship.ts';
import './fellowship.css';

/** A note's words: the Arabic with its reading and meaning, the Morse letters and theirs. */
export function NoteText({ note }: { note: Note }) {
  if (note.kind === 'plain') return <span className="notes__english">{note.english}</span>;
  return (
    <>
      {note.kind === 'arabic' ? (
        <bdi lang="ar" dir="rtl" className="notes__arabic">
          {note.text}
        </bdi>
      ) : (
        <span className="notes__morse">{note.text}</span>
      )}
      {note.latin && <span className="notes__latin">{note.latin}</span>}
      <span className="notes__english">{note.english}</span>
    </>
  );
}

/**
 * The letterbox in a friend's room (task 8.1, #469; the-home.md §13): pick one note from the set
 * to leave them. One a day; picking again today replaces it. Only they and you read it.
 */
export function LeaveNote({
  friend,
  name,
  source,
}: {
  friend: string;
  name: string;
  source: FellowshipSource;
}) {
  const [left, setLeft] = useState<string | null>(null);
  const [said, setSaid] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    let live = true;
    source.noteFor(friend).then(
      (n) => live && setLeft(n),
      () => undefined,
    );
    return () => {
      live = false;
    };
  }, [friend, source]);

  const leave = (n: Note) => {
    if (busy) return;
    setBusy(true);
    source.leaveNote(friend, n.id).then(
      () => {
        setLeft(n.id);
        setSaid(`Your note is in ${name}’s letterbox.`);
        setBusy(false);
      },
      () => {
        setSaid('Couldn’t reach the letterbox just now. Try again in a moment.');
        setBusy(false);
      },
    );
  };

  const today = left ? noteById(left) : undefined;
  return (
    <div className="notes">
      <p className="notes__intro">
        Leave {name} a note. They’ll find it in their letterbox. You can leave one a day; a new one
        today takes the place of the last.
      </p>
      <ul className="notes__list">
        {NOTES.map((n) => (
          <li key={n.id}>
            <button
              type="button"
              className="notes__pick"
              aria-pressed={left === n.id}
              disabled={busy}
              onClick={() => leave(n)}
            >
              <NoteText note={n} />
            </button>
          </li>
        ))}
      </ul>
      <p className="notes__said" role="status">
        {said || (today ? `Today you left ${name} a note: ${today.english}` : '')}
      </p>
    </div>
  );
}

/** The notes at your own letterbox (task 8.1), at the top of the Fellowship. */
export function LetterNotes({ notes, today }: { notes: LetterNote[]; today?: string }) {
  if (notes.length === 0) return null;
  return (
    <>
      <h3 className="fellowship__subheading">Notes in your letterbox</h3>
      <ul className="notes__received">
        {notes.map((n) => {
          const note = noteById(n.note);
          if (!note) return null;
          return (
            <li key={n.id} className="notes__slip">
              <span className="notes__from">
                {n.name}
                {today && n.day ? ` · ${dayLabel(n.day, today)}` : ''}
              </span>
              <NoteText note={note} />
            </li>
          );
        })}
      </ul>
    </>
  );
}
