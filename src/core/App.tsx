import { useEffect } from 'react';
import { subjects } from '../subjects/index.ts';
import { LoginScreen, NotConfiguredScreen, SetPasswordScreen } from './auth/AuthScreens.tsx';
import { missingConfig, supabase } from './auth/supabase.ts';
import { useAuth } from './auth/useAuth.ts';
import { City } from './city/City.tsx';
import { placeAt, residentsOf } from './city/layout.ts';
import { PlaceScreen } from './city/PlaceScreen.tsx';
import { Link } from './Link.tsx';
import { usePath } from './router.ts';
import { GoalReached } from './player/GoalReached.tsx';
import { Hud, QuestTracker } from './player/Hud.tsx';
import { LevelUp } from './player/LevelUp.tsx';
import { createPlayer, usePlayer, type Player } from './player/player.ts';
import { supabaseStore } from './progress/supabaseStore.ts';
import './App.css';

// The signed-in player. Subjects' APIs report awards to it (ADR 0019, 0020).
const player: Player | null = supabase ? createPlayer(supabaseStore(supabase)) : null;

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
    return (
      <>
        <PlaceScreen place={place} resident={residentsOf(subjects).get(place)}>
          {place === 'board' && state.today && (
            <div className="hud">
              <QuestTracker today={state.today} />
            </div>
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
    <City subjects={subjects}>
      <div className="lobby__top">
        <Hud
          state={state}
          onGoalChange={(m) => void player.setDailyGoal(m)}
          onNameChange={player.setDisplayName}
          onSignOut={() => void supabase?.auth.signOut({ scope: 'local' })}
        />
      </div>
      {/* One celebration at a time: the level-up first, then the daily goal. */}
      {celebrations}
    </City>
  );
}
