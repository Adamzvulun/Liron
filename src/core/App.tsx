import { subjects } from '../subjects/index.ts';
import { LoginScreen, NotConfiguredScreen, SetPasswordScreen } from './auth/AuthScreens.tsx';
import { missingConfig, supabase } from './auth/supabase.ts';
import { useAuth } from './auth/useAuth.ts';
import './App.css';

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
      return <Lobby />;
  }
}

// Placeholder lobby until the city (E4) replaces it.
function Lobby() {
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
      <p className="lobby__lead">Choose where to go.</p>
      <ul className="lobby__places">
        {subjects.map((s) => (
          <li key={s.id} className="place" style={{ borderLeftColor: s.guildColor }}>
            <h2 className="place__sign">{s.place}</h2>
            <p className="place__tagline">{s.tagline}</p>
          </li>
        ))}
      </ul>
    </main>
  );
}
