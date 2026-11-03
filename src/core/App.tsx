import { useEffect } from 'react';
import { subjects } from '../subjects/index.ts';
import { LoginScreen, NotConfiguredScreen, SetPasswordScreen } from './auth/AuthScreens.tsx';
import { missingConfig, supabase } from './auth/supabase.ts';
import { useAuth } from './auth/useAuth.ts';
import { City } from './city/City.tsx';
import { GoalReached } from './player/GoalReached.tsx';
import { Hud } from './player/Hud.tsx';
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

// The city square (E4) with the HUD on top. Clickable places come with #25.
function Lobby({ player }: { player: Player }) {
  const state = usePlayer(player);
  useEffect(() => void player.load(), [player]);
  return (
    <City subjects={subjects}>
      <div className="lobby__top">
        <Hud state={state} onGoalChange={(m) => void player.setDailyGoal(m)} />
        <button
          className="lobby__signout"
          type="button"
          onClick={() => void supabase?.auth.signOut({ scope: 'local' })}
        >
          Sign out
        </button>
      </div>
      {/* One celebration at a time: the level-up first, then the daily goal. */}
      {state.levelUp ? (
        <LevelUp award={state.levelUp} onDone={player.dismissLevelUp} />
      ) : (
        state.goalReached && <GoalReached day={state.goalReached} onDone={player.dismissGoal} />
      )}
    </City>
  );
}
