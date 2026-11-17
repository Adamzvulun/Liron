import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { subjects } from '../subjects/index.ts';
import { LoginScreen, NotConfiguredScreen, SetPasswordScreen } from './auth/AuthScreens.tsx';
import { GateScene, WaymarkPost } from './auth/Scenes.tsx';
import { missingConfig, supabase } from './auth/supabase.ts';
import { useAuth } from './auth/useAuth.ts';
import { City } from './city/City.tsx';
import { placeAt, residentsOf } from './city/layout.ts';
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
import { subjectApi } from './progress/subjectApi.ts';
import { supabaseStore } from './progress/supabaseStore.ts';
import { browserPackStore, cachedContent } from './content/packCache.ts';
import { privatePackVersion, supabaseContent } from './content/privateContent.ts';
import { functionPartner } from './partner.ts';
import { functionServices } from './services.ts';
import { functionSpeech } from './speech.ts';
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
const ChestShelf = lazy(() => views().then((m) => ({ default: m.ChestShelf })));
const HouseBackdrop = lazy(() => views().then((m) => ({ default: m.HouseBackdrop })));
const MarketBackdrop = lazy(() => views().then((m) => ({ default: m.MarketBackdrop })));
const BoardBackdrop = lazy(() => views().then((m) => ({ default: m.BoardBackdrop })));

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
            ),
          ] as const,
      )
    : [],
);

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
  // The first page (§8): for a player with no step done anywhere, until closed on this device.
  const [closed, setClosed] = useState(firstPageClosed);
  const welcome = !closed && roads.length > 0 && roads.every((r) => !r.started);
  const celebrations = state.levelUp ? (
    <LevelUp award={state.levelUp} onDone={player.dismissLevelUp} />
  ) : (
    state.goalReached && <GoalReached day={state.goalReached} onDone={player.dismissGoal} />
  );
  if (place) {
    const resident = residentsOf(subjects).get(place);
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
            {Hall && api && (
              <Suspense fallback={<p className="place__loading">Opening the doors…</p>}>
                <Hall api={api} />
              </Suspense>
            )}
            {place === 'board' && (
              <Suspense fallback={null}>
                <BoardBackdrop />
              </Suspense>
            )}
            {place === 'board' && state.today && (
              <div className="hud notice-board">
                <QuestTracker
                  today={state.today}
                  subjects={subjects}
                  compass={compass}
                  contracts={state.contracts}
                  full
                />
                <Suspense fallback={null}>
                  <ChestShelf
                    shelf={chestShelf(state.chests, state.contracts, subjects)}
                    onOpen={player.openChest}
                  />
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
                  onBuy={player.buy}
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
    <City subjects={subjects} look={state.profile?.avatar}>
      <div className="lobby__top">
        <Hud
          state={state}
          subjects={subjects}
          compass={compass}
          onGoalChange={player.setDailyGoal}
          onNameChange={player.setDisplayName}
          services={services}
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
