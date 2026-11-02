import { useEffect } from 'react';
import { subjects } from '../subjects/index.ts';
import { LoginScreen, NotConfiguredScreen, SetPasswordScreen } from './auth/AuthScreens.tsx';
import { missingConfig, supabase } from './auth/supabase.ts';
import { useAuth } from './auth/useAuth.ts';
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

// Placeholder lobby until the city (E4) replaces it.
function Lobby({ player }: { player: Player }) {
  const state = usePlayer(player);
  useEffect(() => void player.load(), [player]);
  return (
    <main className="lobby">
      <div className="lobby__top">
        <h1 className="lobby__title">Waymark</h1>
        <button
          className="lobby__signout"
          type="button"
          onClick={() => void supabase?.auth.signOut({ scope: 'local' })}
        >
          Sign out
        </button>
      </div>
      <Hud state={state} onGoalChange={(m) => void player.setDailyGoal(m)} />
      <p className="lobby__lead">Choose where to go.</p>
      <ul className="lobby__places">
        {subjects.map((s) => (
          <li key={s.id} className="place" style={{ borderLeftColor: s.guildColor }}>
            <h2 className="place__sign">{s.place}</h2>
            <p className="place__tagline">{s.tagline}</p>
          </li>
        ))}
      </ul>
      {/* One celebration at a time: the level-up first, then the daily goal. */}
      {state.levelUp ? (
        <LevelUp award={state.levelUp} onDone={player.dismissLevelUp} />
      ) : (
        state.goalReached && <GoalReached day={state.goalReached} onDone={player.dismissGoal} />
      )}
    </main>
  );
}
