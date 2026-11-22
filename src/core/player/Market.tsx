import { useCallback, useEffect, useState } from 'react';
import { Avatar } from '../avatar/Avatar.tsx';
import type { Look, SlotId } from '../avatar/looks.ts';
import type { MarketStall, Ware } from '../progress/store.ts';
import { Link } from '../Link.tsx';
import { CoinIcon, ShieldIcon } from './icons.tsx';
import { wareName, wareNote } from './market.ts';
import { GiftOffer, type Giving } from '../fellowship/GiftOffer.tsx';
import './market.css';

/** The ware, drawn: your traveler wearing the gear, a dyed tunic, or the shield. */
function WareArt({ ware, look }: { ware: Ware; look: Look }) {
  if (ware.kind === 'functional') {
    return (
      <span className="market__shield">
        <ShieldIcon />
      </span>
    );
  }
  const worn: Look =
    ware.kind === 'color'
      ? { ...look, dye: ware.id as Look['dye'], gear: { ...look.gear, torso: 'tunic' } }
      : { ...look, gear: { ...look.gear, [ware.slot as SlotId]: ware.id } };
  return <Avatar look={worn} className="market__figure" width={96} height={124} />;
}

/**
 * The Market's stall (#49): 4 wares a day, bought with gold. The database checks the stock, the
 * price and what you own; the stall only shows what it's told.
 */
export function Market({
  stall,
  look,
  gold,
  onLoad,
  onBuy,
  giving,
}: {
  stall: MarketStall | null;
  look: Look;
  gold: number | null;
  /** Reads the stall; resolves false if it couldn't. */
  onLoad: () => Promise<boolean>;
  onBuy: (id: string) => Promise<string | null>;
  /** Gifts for friends (task 3.5); absent for a player with no friend. */
  giving?: Giving | null;
}) {
  const [buying, setBuying] = useState<string | null>(null);
  const [said, setSaid] = useState<{ id: string; text: string; ok: boolean } | null>(null);
  const [failed, setFailed] = useState(false);
  const load = useCallback(() => void onLoad().then((ok) => setFailed(!ok)), [onLoad]);
  const retry = () => {
    setFailed(false);
    load();
  };
  useEffect(() => {
    load();
  }, [load]);
  if (!stall) {
    return failed ? (
      <p className="place__loading" role="status">
        The stall couldn’t be set out.{' '}
        <button type="button" className="place__retry" onClick={retry}>
          Try again
        </button>
      </p>
    ) : (
      <p className="place__loading">Setting out the wares…</p>
    );
  }
  const buy = async (w: Ware) => {
    setBuying(w.id);
    const problem = await onBuy(w.id);
    setBuying(null);
    setSaid({ id: w.id, text: problem ?? `${wareName(w)} is yours.`, ok: problem === null });
  };
  return (
    <section className="market" aria-labelledby="market-title">
      <h2 id="market-title" className="market__title">
        Today’s wares
      </h2>
      <p className="market__lede">
        Four wares a day. Gold only, earned by learning.
        {gold !== null && (
          <span className="market__purse">
            <CoinIcon /> {gold.toLocaleString('en-US')} gold
          </span>
        )}
      </p>
      <ul className="market__wares">
        {stall.wares.map((w) => {
          // The purse shown is the newest; the stall's flag may be from before it moved.
          const affordable = gold !== null ? gold >= w.price : w.affordable;
          return (
            <li key={w.id} className={`market__ware market__ware--${w.rarity}`}>
              <WareArt ware={w} look={look} />
              <span className="market__name">{wareName(w)}</span>
              <span className="market__note">{wareNote(w)}</span>
              {w.owned ? (
                <span className="market__owned">
                  {w.kind === 'functional' ? 'You hold 2' : 'Yours'}
                </span>
              ) : (
                <button
                  type="button"
                  className="market__buy"
                  disabled={!affordable || buying !== null}
                  aria-label={`Buy ${wareName(w)} for ${w.price} gold`}
                  onClick={() => void buy(w)}
                >
                  {buying === w.id ? 'Buying…' : `${w.price} gold`}
                </button>
              )}
              {!w.owned && !affordable && gold !== null && (
                <span className="market__short">{w.price - gold} more gold</span>
              )}
              <span className="market__said" role="status">
                {said?.id === w.id ? said.text : ''}
              </span>
              {giving && giving.friends.length > 0 && w.kind !== 'functional' && (
                <GiftOffer
                  item={w.id}
                  name={wareName(w)}
                  price={w.price}
                  affordable={affordable}
                  giving={giving}
                />
              )}
              {said?.id === w.id && said.ok && w.kind !== 'functional' && (
                <Link className="market__try" href="/house#wardrobe">
                  Try it on at your house
                </Link>
              )}
            </li>
          );
        })}
      </ul>
      <p className="market__dawn">New wares at dawn tomorrow.</p>
    </section>
  );
}
