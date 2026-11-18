import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { subjects } from '../subjects/index.ts';
import { LoginScreen, NotConfiguredScreen, SetPasswordScreen } from './auth/AuthScreens.tsx';
import { GateScene, WaymarkPost } from './auth/Scenes.tsx';
import { missingConfig, supabase } from './auth/supabase.ts';
import { useAuth } from './auth/useAuth.ts';
import { passwordRefused } from './auth/password.ts';
import { City } from './city/City.tsx';
import { placeAt, residentsOf } from './city/layout.ts';
import type { PlaceId } from './city/painter.js';
import { PlaceScreen } from './city/PlaceScreen.tsx';
import { PlaceBoundary } from './ErrorBoundary.tsx';
import { Link } from './Link.tsx';
import { usePath } from './router.ts';
import { chestShelf } from './player/chests.ts';
import { GoalReached } from './player/GoalReached.tsx';
import { Hud, QuestTracker } from './player/Hud.tsx';
import { LevelUp } from './player/LevelUp.tsx';
import { createPlayer, usePlayer, type Player } from './player/player.ts';
import { cityErrands, useCompass, type CompassSources } from './player/compass.ts';
import { loadLedger, type LedgerSources } from './player/ledger.ts';
import { firstPageClosed } from './player/firstPage.ts';
import { localDay } from './road/road.ts';
import { eventOn } from './events.ts';
import { stepWatcher } from './player/stepsDone.ts';
import { subjectApi } from './progress/subjectApi.ts';
import { supabaseStore } from './progress/supabaseStore.ts';
import { browserPackStore, cachedContent } from './content/packCache.ts';
import { privatePackVersion, supabaseContent } from './content/privateContent.ts';
import { functionPartner } from './partner.ts';
import { supabaseFellowship, type FriendCard } from './fellowship/fellowship.ts';
import { supabaseChallenges } from './fellowship/challenges.ts';
import { giftProblem, supabaseTogether } from './fellowship/together.ts';
import { supabaseWire } from './fellowship/wire.ts';
import type { Giving } from './fellowship/GiftOffer.tsx';
import { functionServices } from './services.ts';
import { ASSUMED_FACTS, readFacts, RoadFactsContext, type RoadFacts } from './road/facts.ts';
import { functionSpeech } from './speech.ts';
import { armSound, cue, setAmbient } from './sound/sound.ts';
import './App.css';

// The house, the market and the board load when you go there, not with the square (#137).
const views = () => import('./placeViews.tsx');
const FirstPage = lazy(() =>
  import('./player/FirstPage.tsx').then((m) => ({ default: m.FirstPage })),
);
const Wardrobe = lazy(() => views().then((m) => ({ default: m.Wardrobe })));
const AchievementWall = lazy(() => views().then((m) => ({ default: m.AchievementWall })));
const Market = lazy(() => views().then((m) => ({ default: m.Market })));
const Ledger = lazy(() => views().then((m) => ({ default: m.Ledger })));
const Fellowship = lazy(() => views().then((m) => ({ default: m.Fellowship })));
const FriendHouse = lazy(() => views().then((m) => ({ default: m.FriendHouse })));
const PartyFeed = lazy(() => views().then((m) => ({ default: m.PartyFeed })));
const ChestShelf = lazy(() => views().then((m) => ({ default: m.ChestShelf })));
const HouseBackdrop = lazy(() => views().then((m) => ({ default: m.HouseBackdrop })));
const MarketBackdrop = lazy(() => views().then((m) => ({ default: m.MarketBackdrop })));
const BoardBackdrop = lazy(() => views().then((m) => ({ default: m.BoardBackdrop })));
const TogetherQuest = lazy(() => views().then((m) => ({ default: m.TogetherQuest })));
const Arena = lazy(() => views().then((m) => ({ default: m.Arena })));
const ArenaBackdrop = lazy(() => views().then((m) => ({ default: m.ArenaBackdrop })));

// The signed-in player. Subjects' APIs report awards to it (ADR 0019, 0020).
const store = supabase ? supabaseStore(supabase) : null;
const player: Player | null = store ? createPlayer(store) : null;

/** Private content from Supabase, kept in the browser between visits (#124). */
const contentOf = (client: NonNullable<typeof supabase>) =>
  cachedContent(
    supabaseContent(client),
    (subject, source) => privatePackVersion(client, subject, source),
    browserPackStore,
  );

/** The current learner's access token, for our own functions. */
const accessToken = (client: NonNullable<typeof supabase>) => async () =>
  (await client.auth.getSession()).data.session?.access_token ?? null;

/** The "understood" check (ADR 0014), signed in as the current learner. */
const speechOf = (client: NonNullable<typeof supabase>) => functionSpeech(accessToken(client));

/** The AI partner (E15, ADR 0036), signed in as the current learner. */
const partnerOf = (client: NonNullable<typeof supabase>) => functionPartner(accessToken(client));

/** What's switched on (#316), asked as the current learner, once per page. */
const services = supabase ? functionServices(accessToken(supabase)) : undefined;
/**
 * What a road depends on (road/facts.ts): the database says whether this account may read the
 * deck (ADR 0050), and the site whether Sit and talk is switched on (#316). Asked once a page.
 */
const factsOf = (client: NonNullable<typeof supabase>) =>
  readFacts({
    licensee: async () => {
      const { data, error } = await client.rpc('is_content_licensee');
      if (error) throw error;
      return data === true;
    },
    talk: async () => (await services?.())?.talk ?? null,
  });
const roadFacts = supabase ? factsOf(supabase) : undefined;
/** Friends (task 3.1): through the database's Fellowship functions only. */
const fellowship = supabase ? supabaseFellowship(supabase) : null;
/** Settings' sharing switch (task 3.3). */
/** Challenges between friends (task 3.4): scores come from saved sessions only. */
const challenges =
  supabase && fellowship
    ? supabaseChallenges(supabase, () =>
        fellowship
          .cards()
          .then((cards) => cards.filter((c) => !c.me).map((c) => ({ id: c.id, name: c.name }))),
      )
    : null;

/** The wire (task 3.6): live Morse between two friends, over a private Realtime channel. */
const wire =
  supabase && fellowship
    ? supabaseWire(supabase, () =>
        fellowship
          .cards()
          .then((cards) => cards.filter((c) => !c.me).map((c) => ({ id: c.id, name: c.name }))),
      )
    : null;

/** Fellowship quests and gifts (task 3.5): counted, paid and given by the database. */
const together = supabase && fellowship ? supabaseTogether(supabase) : null;
const readGifts = together ? () => together.gifts() : undefined;

const sharing = fellowship
  ? {
      load: () =>
        Promise.all([fellowship.cards(), fellowship.sharing()]).then(
          ([cards, on]) => ({ friends: cards.some((c) => !c.me), on }),
          () => null,
        ),
      set: (on: boolean) =>
        fellowship.setSharing(on).then(
          () => true,
          () => false,
        ),
    }
  : undefined;
/** Each guild's building, for the party feed's lines: `morse` → "the Signal Tower". */
const PLACES = new Map(subjects.map((s) => [s.id, `the ${s.place}`]));
/** A friend's house: /house/visit/<their id> (task 3.2). */
const VISIT = /^\/house\/visit\/([0-9a-f-]{36})\/?$/i;
/** The Arena beyond the square (task 3.4): challenges between friends. */
const ARENA = /^\/arena\/?$/;

/** Settings' "Change your password" (#324): null when saved, else what to tell the player. */
const changePassword = async (password: string): Promise<string | null> => {
  if (!supabase) return passwordRefused(undefined);
  try {
    const { error } = await supabase.auth.updateUser({ password });
    return error ? passwordRefused(error.code) : null;
  } catch {
    return passwordRefused(undefined);
  }
};

/** Each subject's API, bound to its id and reporting awards to the player. */
const apis = new Map(
  store && player
    ? subjects.map(
        (s) =>
          [
            s.id,
            subjectApi(
              s,
              store,
              player.applyAward,
              supabase ? contentOf(supabase) : null,
              supabase ? speechOf(supabase) : null,
              supabase ? partnerOf(supabase) : null,
              challenges ?? undefined,
              wire ?? undefined,
            ),
          ] as const,
      )
    : [],
);

/** The guilds whose road moved since the square was last shown (task 4.6). */
const stepsDone = stepWatcher();

/** Where the ledger in Your House reads from (docs/game/ledger.md). */
const ledgerSources: LedgerSources = {
  loadState: (id) => compassSources.loadState(id),
  due: (id) => compassSources.due(id),
  cards: (id) => store?.cardSummary(id) ?? Promise.resolve([]),
  reviewsSince: (id, since) => store?.reviewsSince(id, since) ?? Promise.resolve([]),
  activity: () => store?.activity() ?? Promise.resolve([]),
};

/** What the compass asks about each subject (docs/game/the-road.md §6). */
const compassSources: CompassSources = {
  loadState: (id) => apis.get(id)?.loadState() ?? Promise.resolve(null),
  due: async (id) => (await apis.get(id)?.dueItems())?.length ?? 0,
  practiced: () => store?.practiced() ?? Promise.resolve([]),
  ...(roadFacts && { facts: roadFacts }),
};

export function App() {
  if (!supabase) return <NotConfiguredScreen missing={missingConfig} />;
  return <AuthGate />;
}

function AuthGate() {
  const [auth, passwordChosen] = useAuth();
  // Leaving an account, however it happens (the button, an expired login, another tab), starts
  // the page afresh: the subjects' unsaved progress and in-memory deck and the player's purse
  // are per account and mustn't reach the next one to sign in here. Signed out, the kept deck
  // is wiped too, also on a fresh page, so a write that landed after a wipe goes as well
  // (review, 2026-11-15; #124, ADR 0023).
  const was = useRef(auth.status);
  useEffect(() => {
    const before = was.current;
    was.current = auth.status;
    if (auth.status !== 'signedOut') return;
    const wiped = browserPackStore.clear().catch(() => {});
    if (before === 'signedIn' || before === 'setPassword') {
      void wiped.then(() => window.location.assign('/'));
    }
  }, [auth.status]);
  switch (auth.status) {
    case 'loading':
      // Usually gone before it shows; on a slow line, a word instead of an empty screen.
      return (
        <div className="app__loading">
          <GateScene open />
          <p role="status">Opening the gates…</p>
        </div>
      );
    case 'signedOut':
      return <LoginScreen />;
    case 'setPassword':
      return <SetPasswordScreen onDone={passwordChosen} />;
    case 'signedIn':
      return player && <Lobby player={player} />;
  }
}

// The city square (E4) with the HUD on top, or the screen of the place you entered (#25).
function Lobby({ player }: { player: Player }) {
  const state = usePlayer(player);
  const path = usePath();
  const [facts, setFacts] = useState<RoadFacts>(ASSUMED_FACTS);
  useEffect(() => {
    let live = true;
    void roadFacts?.().then((f) => live && setFacts(f));
    return () => {
      live = false;
    };
  }, []);
  // Both at once (#137): the player keeps the contracts' purse, which is never older. Again when
  // you come back to the tab on a new day, so the top bar doesn't show yesterday's goal and
  // contracts after midnight (review, 2026-11-15).
  useEffect(() => {
    const load = () => void Promise.all([player.load(), player.loadContracts()]);
    let day = new Date().toDateString();
    load();
    const back = () => {
      if (document.visibilityState !== 'visible' || new Date().toDateString() === day) return;
      day = new Date().toDateString();
      load();
    };
    document.addEventListener('visibilitychange', back);
    window.addEventListener('focus', back);
    return () => {
      document.removeEventListener('visibilitychange', back);
      window.removeEventListener('focus', back);
    };
  }, [player]);
  const moved = useRef(false);
  useEffect(() => {
    // Again on every move: a session in a hall may have finished one.
    if (moved.current) void player.loadContracts();
    moved.current = true;
  }, [player, path]);
  const today = state.today?.day;
  const readLedger = useCallback(
    () => loadLedger(subjects, ledgerSources, today ?? localDay()),
    [today],
  );
  const place = placeAt(path);
  // The world event on the player's day, if any (task 4.4).
  const event = eventOn(today);
  // The city's sounds (task 4.6): armed once, and the bed follows the player; halls have none.
  useEffect(() => armSound(), []);
  const resident = place ? residentsOf(subjects).get(place) : undefined;
  useEffect(() => {
    const bed = place === 'tower' || place === 'caravanserai' || resident ? null : place;
    setAmbient(place ? (bed ?? null) : path === '/' ? 'square' : null);
  }, [place, resident, path]);
  const openChest = useCallback(
    async (id: string) => {
      const c = await player.openChest(id);
      if (c) cue('reward');
      return c;
    },
    [player],
  );
  const buy = useCallback(
    async (id: string) => {
      const why = await player.buy(id);
      if (why === null) cue('reward');
      return why;
    },
    [player],
  );
  // Read again on every move, so coming back from a hall shows the step just done.
  const unpaid = state.contracts?.contracts.flatMap((c) => (c.paid || !c.subject ? [] : c.subject));
  const roads = useCompass(subjects, compassSources, state.today?.day, unpaid ?? [], path);
  // The guilds' lines, then the city's own errands (the-road.md §7).
  const compass = [
    ...roads,
    ...(state.wallet && state.profile
      ? cityErrands({
          chests: state.chests.length,
          gold: state.wallet.gold,
          owned: state.profile.owned,
          avatar: state.profile.avatar,
        })
      : []),
  ];
  // Back on the square after a step: that guild's building lights up, with a bell (task 4.6).
  const [lit, setLit] = useState<PlaceId[]>([]);
  useEffect(() => {
    if (path !== '/') {
      // Out of the square the lamps go out, so they can light again on the way back.
      const out = setTimeout(() => setLit([]), 0);
      return () => clearTimeout(out);
    }
    const moved = stepsDone(roads).flatMap((id) => {
      const building = subjects.find((s) => s.id === id)?.building;
      return building ? [building] : [];
    });
    if (moved.length === 0) return;
    cue('step');
    // After the square's first paint, so the lamps visibly light.
    const on = setTimeout(() => setLit(moved), 0);
    const off = setTimeout(() => setLit([]), 2000);
    return () => {
      clearTimeout(on);
      clearTimeout(off);
    };
  }, [path, roads]);
  // Friends in the square (task 3.3): read once the square is up, so they never slow its first
  // paint (task 1.7's budget), and again on each return to the square.
  const [friends, setFriends] = useState<FriendCard[]>([]);
  useEffect(() => {
    if (path !== '/' || !fellowship) return;
    let live = true;
    const later = setTimeout(() => {
      fellowship.cards().then(
        (cards) => live && setFriends(cards.filter((c) => !c.me)),
        () => undefined,
      );
    }, 400);
    return () => {
      live = false;
      clearTimeout(later);
    };
  }, [path]);
  // Gifts in the Market (task 3.5): the friends to give to, read on arrival there.
  const [giftFriends, setGiftFriends] = useState<{ id: string; name: string }[]>([]);
  useEffect(() => {
    if (place !== 'market' || !fellowship) return;
    let live = true;
    fellowship.cards().then(
      (cards) =>
        live && setGiftFriends(cards.filter((c) => !c.me).map((c) => ({ id: c.id, name: c.name }))),
      () => undefined,
    );
    return () => {
      live = false;
    };
  }, [place]);
  const giving: Giving | null = together && {
    friends: giftFriends,
    give: (friend, item) => {
      const show = player.purse();
      return together.give(friend.id, item).then(
        (gold) => {
          show(gold);
          return null;
        },
        (e: unknown) => giftProblem(e, friend.name),
      );
    },
  };
  // The first page (§8): for a player with no step done anywhere, until closed on this device.
  const [closed, setClosed] = useState(firstPageClosed);
  const welcome = !closed && roads.length > 0 && roads.every((r) => !r.started);
  const celebrations = state.levelUp ? (
    <LevelUp award={state.levelUp} onDone={player.dismissLevelUp} />
  ) : (
    state.goalReached && <GoalReached day={state.goalReached} onDone={player.dismissGoal} />
  );
  const visiting = VISIT.exec(path)?.[1];
  if (visiting && fellowship) {
    return (
      <>
        <Suspense fallback={<p className="place__loading">Knocking at the door…</p>}>
          <FriendHouse
            key={visiting}
            id={visiting}
            source={fellowship}
            backdrop={<HouseBackdrop />}
          />
        </Suspense>
        {celebrations}
      </>
    );
  }
  if (ARENA.test(path) && challenges) {
    return (
      <>
        <PlaceScreen place="arena" wide>
          <Suspense fallback={<p className="place__loading">Opening the gates…</p>}>
            <ArenaBackdrop />
            <Arena source={challenges} today={today ?? localDay()} />
          </Suspense>
        </PlaceScreen>
        {celebrations}
      </>
    );
  }
  if (place) {
    const Hall = resident?.Hall;
    const api = resident && apis.get(resident.id);
    return (
      <>
        <PlaceScreen
          place={place}
          resident={resident}
          wide={place === 'house' || place === 'market' || !!Hall}
        >
          <PlaceBoundary key={place}>
            {/* The house, market and board stand on the player's own records: if those couldn't
                load, say so, rather than leave an empty room (review, 2026-11-17). */}
            {(place === 'house' || place === 'market' || place === 'board') && state.error && (
              <p className="place__loading" role="alert">
                Your records couldn’t be read. Check your connection.{' '}
                <button
                  type="button"
                  className="place__retry"
                  onClick={() => window.location.reload()}
                >
                  Reload
                </button>
              </p>
            )}
            {Hall && api && (
              <Suspense fallback={<p className="place__loading">Opening the doors…</p>}>
                <RoadFactsContext.Provider value={facts}>
                  <Hall api={api} />
                </RoadFactsContext.Provider>
              </Suspense>
            )}
            {place === 'board' && (
              <Suspense fallback={null}>
                <BoardBackdrop />
              </Suspense>
            )}
            {place === 'board' && state.today && (
              <div className="hud notice-board">
                {event && (
                  <p className="notice-board__event" role="note">
                    {event.line}
                  </p>
                )}
                <QuestTracker
                  today={state.today}
                  subjects={subjects}
                  compass={compass}
                  contracts={state.contracts}
                  full
                />
                <Suspense fallback={null}>
                  <ChestShelf
                    shelf={chestShelf(state.chests, state.contracts, subjects, event?.chest)}
                    onOpen={openChest}
                  />
                  {together && <TogetherQuest source={together} onPurse={player.purse} />}
                  {fellowship && (
                    <PartyFeed source={fellowship} places={PLACES} today={state.today.day} />
                  )}
                </Suspense>
              </div>
            )}
            {place === 'market' && (
              <Suspense fallback={null}>
                <MarketBackdrop />
              </Suspense>
            )}
            {place === 'market' && state.profile && (
              <Suspense fallback={<p className="place__loading">Setting out the wares…</p>}>
                <Market
                  stall={state.market}
                  look={state.profile.avatar}
                  gold={state.wallet?.gold ?? null}
                  onLoad={player.loadMarket}
                  onBuy={buy}
                  giving={giving}
                />
              </Suspense>
            )}
            {place === 'house' && (
              <Suspense fallback={null}>
                <HouseBackdrop />
              </Suspense>
            )}
            {place === 'house' && state.profile && (
              <Suspense fallback={<p className="place__loading">Opening the doors…</p>}>
                <Wardrobe
                  look={state.profile.avatar}
                  owned={state.profile.owned}
                  name={state.profile.displayName}
                  onSave={player.setAvatar}
                />
                {today && <Ledger onLoad={readLedger} roads={roads} />}
                <AchievementWall
                  mine={state.achievements}
                  title={state.profile.title}
                  onLoad={player.loadAchievements}
                  onWear={player.setTitle}
                />
                {fellowship && <Fellowship source={fellowship} gifts={readGifts} today={today} />}
              </Suspense>
            )}
          </PlaceBoundary>
        </PlaceScreen>
        {celebrations}
      </>
    );
  }
  if (path !== '/') return <Lost />;
  return (
    <City
      subjects={subjects}
      look={state.profile?.avatar}
      lit={lit}
      event={event}
      friends={friends}
    >
      <div className="lobby__top">
        <Hud
          state={state}
          subjects={subjects}
          compass={compass}
          onGoalChange={player.setDailyGoal}
          onNameChange={player.setDisplayName}
          services={services}
          onPasswordChange={changePassword}
          sharing={sharing}
          onSignOut={() => {
            // AuthGate wipes the kept deck (#124) and starts the page afresh.
            void supabase?.auth.signOut({ scope: 'local' });
          }}
        />
      </div>
      {/* One celebration at a time: the level-up first, then the daily goal. */}
      {celebrations ||
        (welcome && (
          <Suspense fallback={null}>
            <FirstPage guilds={roads} onClose={() => setClosed(true)} />
          </Suspense>
        ))}
    </City>
  );
}

/** An address that isn't a place in Waymark. */
function Lost() {
  useEffect(() => {
    document.title = 'Lost? – Waymark';
    return () => {
      document.title = 'Waymark';
    };
  }, []);
  return (
    <main className="place-screen" data-ground="cobble">
      <h1 className="place-screen__title">Lost?</h1>
      <WaymarkPost />
      <p className="place-screen__soon">
        There’s no such place in Waymark. <Link href="/">Back to the square</Link>
      </p>
    </main>
  );
}
