import { useId, useState } from 'react';
import { PasswordField } from '../auth/PasswordField.tsx';
import { useDialogFocus } from '../player/useDialogFocus.ts';
import { DELETE_WORD, deleteWordOk } from './account.ts';
import './account.css';

/** What Settings' danger area does; absent where there is no database. */
export interface AccountSource {
  /** Saves the player's data as a file; resolves false if it couldn't. */
  download: () => Promise<boolean>;
  /** Deletes the account after the password; resolves to null once gone, else what to tell the player. */
  remove: (password: string) => Promise<string | null>;
}

/** Settings' danger area (#500): your data to keep, and deleting the account, which is final. */
export function DangerZone({ source }: { source: AccountSource }) {
  const [asking, setAsking] = useState(false);
  const [note, setNote] = useState('');
  const download = async () => {
    setNote('');
    setNote(
      (await source.download()) ? 'Saved to your downloads.' : 'Couldn’t save it. Try again.',
    );
  };
  return (
    <section className="danger" aria-labelledby="danger-head">
      <h3 id="danger-head" className="danger__head">
        Danger area
      </h3>
      <button
        type="button"
        className="hud__textbutton danger__keep"
        onClick={() => void download()}
      >
        Download my data
      </button>
      <p className="danger__note" role="status">
        {note || 'One file with your progress, reviews, room and notes. Yours to keep.'}
      </p>
      <button type="button" className="danger__delete" onClick={() => setAsking(true)}>
        Delete my account…
      </button>
      {asking && <DeleteDialog source={source} onClose={() => setAsking(false)} />}
    </section>
  );
}

function DeleteDialog({ source, onClose }: { source: AccountSource; onClose: () => void }) {
  const first = useDialogFocus<HTMLButtonElement>();
  const titleId = useId();
  const [password, setPassword] = useState('');
  const [typed, setTyped] = useState('');
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [status, setStatus] = useState('');
  const ready = password !== '' && deleteWordOk(typed) && !busy;
  const keep = async () => {
    const ok = await source.download();
    setSaved(ok);
    setStatus(ok ? '' : 'Couldn’t save your data. Try again.');
  };
  const remove = async () => {
    setBusy(true);
    setStatus('');
    const refused = await source.remove(password);
    // On success the page starts afresh at the goodbye; only a refusal comes back here.
    if (refused) {
      setBusy(false);
      setStatus(refused);
    }
  };
  return (
    <div
      className="danger__overlay"
      role="presentation"
      onKeyDown={(e) => e.key === 'Escape' && !busy && onClose()}
    >
      <div className="danger__dialog" role="dialog" aria-modal="true" aria-labelledby={titleId}>
        <h2 id={titleId} className="danger__title">
          Delete your account?
        </h2>
        <p>
          This removes your progress, your room, your notes and chats, and your login. Your friends
          keep their own, and lose you from their list.
        </p>
        <p className="danger__final">
          It is final. There is no undo, and no one can bring it back.
        </p>
        <button
          ref={first}
          type="button"
          className="hud__textbutton danger__keep"
          onClick={() => void keep()}
        >
          Download my data first
        </button>
        {saved && <p className="danger__note">Saved to your downloads.</p>}
        <form
          className="hud__field danger__form"
          onSubmit={(e) => {
            e.preventDefault();
            if (ready) void remove();
          }}
        >
          <PasswordField
            label="Your password"
            autoComplete="current-password"
            value={password}
            onChange={setPassword}
            className=""
            inputClassName=""
          />
          <label>
            Type {DELETE_WORD} to confirm
            <input
              type="text"
              value={typed}
              autoComplete="off"
              autoCapitalize="off"
              autoCorrect="off"
              spellCheck={false}
              onChange={(e) => setTyped(e.target.value)}
            />
          </label>
          <div className="hud__passwordbuttons">
            <button type="submit" className="danger__delete" disabled={!ready}>
              {busy ? 'Deleting…' : 'Delete my account for good'}
            </button>
            <button type="button" className="hud__textbutton" disabled={busy} onClick={onClose}>
              Keep my account
            </button>
          </div>
          <span className="hud__fieldstatus" role="alert">
            {status}
          </span>
        </form>
      </div>
    </div>
  );
}
