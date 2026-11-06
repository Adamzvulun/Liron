import { useState, type ReactNode } from 'react';
import { Avatar } from './Avatar.tsx';
import {
  BEARDS,
  BUILDS,
  FACES,
  GEAR,
  HAIR_COLOURS,
  HAIRS,
  SKINS,
  SLOTS,
  type Look,
  type SlotId,
} from './looks.ts';
import './wardrobe.css';

type Part = 'build' | 'skin' | 'face' | 'hair' | 'hairColour' | 'beard';

/**
 * The customiser in Your House (#29): a mirror with a live preview, the look's options, and
 * the gear slots. Locked gear says how it's earned. Nothing is saved until "Save my look".
 */
export function Wardrobe({
  look: saved,
  name,
  onSave,
}: {
  look: Look;
  name: string;
  onSave: (look: Look) => Promise<boolean>;
}) {
  const [look, setLook] = useState(saved);
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'failed'>('idle');
  const changed = JSON.stringify(look) !== JSON.stringify(saved);
  const choose = (next: Look) => {
    setLook(next);
    setStatus('idle');
  };
  const pick = (part: Part, value: string) => choose({ ...look, [part]: value });
  const wear = (slot: SlotId, item?: string) =>
    choose({ ...look, gear: { ...look.gear, [slot]: item } });
  const save = async () => {
    setStatus('saving');
    setStatus((await onSave(look)) ? 'saved' : 'failed');
  };

  return (
    <div className="wardrobe">
      <div className="wardrobe__side">
        <div className="wardrobe__mirror">
          <div className="wardrobe__room" aria-hidden="true" />
          <Avatar look={look} className="wardrobe__figure" />
          <p className="wardrobe__name">{name || 'Traveler'}</p>
        </div>

        <div className="wardrobe__actions">
          <button
            type="button"
            className="wardrobe__save"
            disabled={!changed || status === 'saving'}
            onClick={() => void save()}
          >
            {status === 'saving' ? 'Saving…' : 'Save my look'}
          </button>
          <button
            type="button"
            className="wardrobe__undo"
            disabled={!changed}
            onClick={() => choose(saved)}
          >
            Undo changes
          </button>
          <p className="wardrobe__status" role="status">
            {status === 'saved' && 'Saved. The city sees your new look.'}
            {status === 'failed' && "Couldn't save your look. Try again."}
          </p>
        </div>
      </div>

      <div className="wardrobe__options">
        <h2 className="wardrobe__heading">Look</h2>
        <Choice label="Build">
          {BUILDS.map((b) => (
            <Option
              key={b.id}
              group="build"
              checked={look.build === b.id}
              onChange={() => pick('build', b.id)}
              label={b.label}
            >
              <Avatar
                look={{ ...look, build: b.id, gear: {} }}
                shadow={false}
                width={52}
                height={84}
              />
            </Option>
          ))}
        </Choice>
        <Choice label="Skin">
          {SKINS.map((s) => (
            <Option
              key={s.id}
              group="skin"
              checked={look.skin === s.id}
              onChange={() => pick('skin', s.id)}
              label={s.label}
              swatch
            >
              <span
                className="wardrobe__swatch"
                style={{
                  background: `radial-gradient(circle at 35% 30%, ${s.light}, ${s.mid} 60%, ${s.dark})`,
                }}
              />
            </Option>
          ))}
        </Choice>
        <Choice label="Face">
          {FACES.map((f) => (
            <Option
              key={f.id}
              group="face"
              checked={look.face === f.id}
              onChange={() => pick('face', f.id)}
              label={f.label}
            >
              <Avatar look={{ ...look, face: f.id }} view="portrait" width={56} height={56} />
            </Option>
          ))}
        </Choice>
        <Choice label="Hair">
          {HAIRS.map((h) => (
            <Option
              key={h.id}
              group="hair"
              checked={look.hair === h.id}
              onChange={() => pick('hair', h.id)}
              label={h.label}
            >
              <Avatar
                look={{ ...look, hair: h.id, gear: { ...look.gear, head: undefined } }}
                view="portrait"
                width={56}
                height={56}
              />
            </Option>
          ))}
        </Choice>
        <Choice label="Hair color">
          {HAIR_COLOURS.map((c) => (
            <Option
              key={c.id}
              group="hairColour"
              checked={look.hairColour === c.id}
              onChange={() => pick('hairColour', c.id)}
              label={c.label}
              swatch
            >
              <span
                className="wardrobe__swatch"
                style={{ background: `linear-gradient(160deg, ${c.light}, ${c.dark})` }}
              />
            </Option>
          ))}
        </Choice>
        <Choice label="Beard">
          {BEARDS.map((b) => (
            <Option
              key={b.id}
              group="beard"
              checked={look.beard === b.id}
              onChange={() => pick('beard', b.id)}
              label={b.label}
            >
              <Avatar look={{ ...look, beard: b.id }} view="portrait" width={56} height={56} />
            </Option>
          ))}
        </Choice>

        <h2 className="wardrobe__heading">Gear</h2>
        {SLOTS.map((slot) => {
          const items = GEAR.filter((g) => g.slot === slot.id);
          return (
            <Choice key={slot.id} label={slot.label}>
              <Option
                group={`gear-${slot.id}`}
                checked={!look.gear[slot.id]}
                onChange={() => wear(slot.id)}
                label="Plain"
                wide
              />
              {items.map((item) =>
                item.starter ? (
                  <Option
                    key={item.id}
                    group={`gear-${slot.id}`}
                    checked={look.gear[slot.id] === item.id}
                    onChange={() => wear(slot.id, item.id)}
                    label={item.name}
                    wide
                  />
                ) : (
                  <div key={item.id} className="wardrobe__locked">
                    <svg className="wardrobe__lock" aria-hidden="true" viewBox="0 0 24 28">
                      <path
                        d="M6 12 V8 a6 6 0 0 1 12 0 V12"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="3.5"
                      />
                      <rect x="2" y="12" width="20" height="14" rx="3" fill="currentColor" />
                    </svg>
                    <span>
                      <strong>{item.name}</strong>
                      <span className="visually-hidden"> (locked)</span>
                      <span className="wardrobe__earn">{item.earn}</span>
                    </span>
                  </div>
                ),
              )}
            </Choice>
          );
        })}
      </div>
    </div>
  );
}

function Choice({ label, children }: { label: string; children: ReactNode }) {
  return (
    <fieldset className="wardrobe__choice">
      <legend>{label}</legend>
      <div className="wardrobe__row">{children}</div>
    </fieldset>
  );
}

function Option({
  group,
  checked,
  onChange,
  label,
  swatch,
  wide,
  children,
}: {
  group: string;
  checked: boolean;
  onChange: () => void;
  label: string;
  swatch?: boolean;
  wide?: boolean;
  children?: ReactNode;
}) {
  const cls = [
    'wardrobe__option',
    swatch && 'wardrobe__option--swatch',
    wide && 'wardrobe__option--wide',
  ]
    .filter(Boolean)
    .join(' ');
  return (
    <label className={cls} title={label}>
      <input type="radio" name={group} checked={checked} onChange={onChange} />
      {children}
      <span className={swatch ? 'visually-hidden' : 'wardrobe__label'}>{label}</span>
    </label>
  );
}
