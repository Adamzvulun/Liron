import { useId, useState, type KeyboardEvent } from 'react';
import './passwordField.css';

/**
 * A password box with a Show button and a Caps Lock warning, the same on the sign-in screens and
 * in Settings (Adam, 2026-11-19: "make sure the UX is on point"). The label is its own element,
 * so the box's name is exactly the label, and the button says what it does.
 */
export function PasswordField({
  label,
  value,
  onChange,
  autoComplete,
  minLength,
  describedBy,
  className = 'auth__label',
  inputClassName = 'auth__input',
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  autoComplete: 'current-password' | 'new-password';
  minLength?: number;
  /** The id of a hint under the field. */
  describedBy?: string;
  /** The wrapper's class: the sign-in panel's by default, Settings passes its own. */
  className?: string;
  inputClassName?: string;
}) {
  const id = useId();
  const capsId = useId();
  const [shown, setShown] = useState(false);
  const [caps, setCaps] = useState(false);
  // Read on every key: Caps Lock can change while the box has focus.
  const readCaps = (e: KeyboardEvent<HTMLInputElement>) =>
    setCaps(e.getModifierState?.('CapsLock') ?? false);
  const described = [describedBy, caps ? capsId : undefined].filter(Boolean).join(' ');
  return (
    <div className={`${className} pwfield`}>
      <label htmlFor={id}>{label}</label>
      <span className="pwfield__row">
        <input
          id={id}
          className={inputClassName}
          type={shown ? 'text' : 'password'}
          autoComplete={autoComplete}
          // A shown password is still a password: no spelling marks, no capital first letter.
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
          required
          minLength={minLength}
          aria-describedby={described || undefined}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={readCaps}
          onKeyUp={readCaps}
          onBlur={() => setCaps(false)}
        />
        <button
          type="button"
          className="pwfield__show"
          aria-controls={id}
          aria-pressed={shown}
          aria-label={shown ? `Hide ${label.toLowerCase()}` : `Show ${label.toLowerCase()}`}
          onClick={() => setShown((s) => !s)}
        >
          {shown ? 'Hide' : 'Show'}
        </button>
      </span>
      {caps && (
        <span id={capsId} className="pwfield__caps" role="status">
          Caps Lock is on.
        </span>
      )}
    </div>
  );
}
