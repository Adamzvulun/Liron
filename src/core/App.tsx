import { Suspense, useEffect } from 'react';
import { subjects } from '../subjects/index.ts';
import { LoginScreen, NotConfiguredScreen, SetPasswordScreen } from './auth/AuthScreens.tsx';
import { missingConfig, supabase } from './auth/supabase.ts';
import { useAuth } from './auth/useAuth.ts';
import { Wardrobe } from './avatar/Wardrobe.tsx';
import { City } from './city/City.tsx';
import { placeAt, residentsOf } from './city/layout.ts';
import { PlaceScreen } from './city/PlaceScreen.tsx';
import { Link } from './Link.tsx';
import { usePath } from './router.ts';
import { GoalReached } from './player/GoalReached.tsx';
import { Hud, QuestTracker } from './player/Hud.tsx';
import { LevelUp } from './player/LevelUp.tsx';
import { createPlayer, usePlayer, type Player } from './player/player.ts';
import { subjectApi } from './progress/subjectApi.ts';
import { supabaseStore } from './progress/supabaseStore.ts';
import { browserPackStore, cachedContent } from './content/packCache.ts';
import { privatePackVersion, supabaseContent } from './content/privateContent.ts';
import './App.css';

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

/** Each subject's API, bound to its id and reporting awards to the player. */
const apis = new Map(
  store && player
    ? subjects.map(
        (s) =>
          [
            s.id,
            subjectApi(s, store, player.applyAward, supabase ? contentOf(supabase) : null),
          ] as const,
      )
    : [],
);

export function App() {
  if (!supabase) return <NotConfiguredScreen missing={missingConfig} />;
  return <AuthGate />;
}

function AuthGate() {
  const [auth, passwordChosen] = useAuth();
  switch (auth.status) {
    case 'loading':
      return null;
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
  useEffect(() => void player.load(), [player]);
  const place = placeAt(path);
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
        <PlaceScreen place={place} resident={resident} wide={place === 'house' || !!Hall}>
          {Hall && api && (
            <Suspense fallback={<p className="place__loading">Opening the doors…</p>}>
              <Hall api={api} />
            </Suspense>
          )}
          {place === 'board' && state.today && (
            <div className="hud">
              <QuestTracker today={state.today} subjects={subjects} />
            </div>
          )}
          {place === 'house' && state.profile && (
            <Wardrobe
              look={state.profile.avatar}
              name={state.profile.displayName}
              onSave={player.setAvatar}
            />
          )}
        </PlaceScreen>
        {celebrations}
      </>
    );
  }
  if (path !== '/') {
    return (
      <main className="place-screen">
        <h1 className="place-screen__title">Lost?</h1>
        <p className="place-screen__soon">
          There's no such place in Waymark. <Link href="/">Back to the square</Link>
        </p>
      </main>
    );
  }
  return (
    <City subjects={subjects} look={state.profile?.avatar}>
      <div className="lobby__top">
        <Hud
          state={state}
          subjects={subjects}
          onGoalChange={(m) => void player.setDailyGoal(m)}
          onNameChange={player.setDisplayName}
          onSignOut={() => {
            // The kept deck goes with the login (#124).
            void browserPackStore.clear().catch(() => {});
            void supabase?.auth.signOut({ scope: 'local' });
          }}
        />
      </div>
      {/* One celebration at a time: the level-up first, then the daily goal. */}
      {celebrations}
    </City>
  );
}
