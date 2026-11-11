import { useState, type ReactNode } from 'react';
import { Avatar } from './Avatar.tsx';
import {
  BEARDS,
  BUILDS,
  DYES,
  FACES,
  GEAR,
  HAIR_COLOURS,
  HAIRS,
  SCARVES,
  SKINS,
  SLOTS,
  canWear,
  type DyeId,
  type Look,
  type SlotId,
} from './looks.ts';
import './wardrobe.css';

type Part = 'build' | 'skin' | 'face' | 'hair' | 'hairColour' | 'beard';

/**
 * The customiser in Your House (#29): a mirror with a live preview, the look's options, and
 * the gear slots. Gear you don't own yet says how it's earned. Nothing is saved until "Save my
 * look".
 */
export function Wardrobe({
  look: saved,
  owned: ownedIds = [],
  name,
  onSave,
}: {
  look: Look;
  /** Ids of the items the player owns (ADR 0033). */
  owned?: readonly string[];
  name: string;
  onSave: (look: Look) => Promise<boolean>;
}) {
  const [look, setLook] = useState(saved);
  const owned = new Set(ownedIds);
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'failed'>('idle');
  const changed = JSON.stringify(look) !== JSON.stringify(saved);
  const choose = (next: Look) => {
    setLook(next);
    setStatus('idle');
  };
  const pick = (part: Part, value: string) => choose({ ...look, [part]: value });
  const dyeWith = (dye?: DyeId) => {
    choose({ ...look, dye });
  };
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
        <Choice label="Headscarf">
          <Option
            group="scarf"
            checked={!look.scarf}
            onChange={() => choose({ ...look, scarf: undefined })}
            label="None"
          >
            <Avatar look={{ ...look, scarf: undefined }} view="portrait" width={56} height={56} />
          </Option>
          {SCARVES.map((c) => (
            <Option
              key={c.id}
              group="scarf"
              checked={look.scarf === c.id}
              onChange={() => choose({ ...look, scarf: c.id })}
              label={c.label}
            >
              <Avatar look={{ ...look, scarf: c.id }} view="portrait" width={56} height={56} />
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
                canWear(item, owned) ? (
                  <Option
                    key={item.id}
                    group={`gear-${slot.id}`}
                    checked={look.gear[slot.id] === item.id}
                    onChange={() => wear(slot.id, item.id)}
                    label={item.name}
                    wide
                  />
                ) : (
                  <Locked key={item.id} name={item.name} earn={item.earn ?? ''} />
                ),
              )}
            </Choice>
          );
        })}
        <Choice label="Tunic dye">
          <Option
            group="dye"
            checked={!look.dye}
            onChange={() => dyeWith()}
            label="Teal (undyed)"
            swatch
          >
            <span className="wardrobe__swatch wardrobe__swatch--teal" />
          </Option>
          {DYES.map((d) =>
            owned.has(d.id) ? (
              <Option
                key={d.id}
                group="dye"
                checked={look.dye === d.id}
                onChange={() => dyeWith(d.id)}
                label={d.label}
                swatch
              >
                <span
                  className="wardrobe__swatch"
                  style={{ background: `linear-gradient(160deg, ${d.light}, ${d.dark})` }}
                />
              </Option>
            ) : (
              <Locked key={d.id} name={d.label} earn="From chests and the Market" />
            ),
          )}
        </Choice>
      </div>
    </div>
  );
}

/** Something the player doesn't own yet, and how it's earned. */
function Locked({ name, earn }: { name: string; earn: string }) {
  return (
    <div className="wardrobe__locked">
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
        <strong>{name}</strong>
        <span className="visually-hidden"> (locked)</span>
        <span className="wardrobe__earn">{earn}</span>
      </span>
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
