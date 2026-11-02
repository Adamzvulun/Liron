import { subjects } from '../subjects/index.ts';
import './App.css';

// Placeholder lobby until the city (E4) replaces it.
export function App() {
  return (
    <main className="lobby">
      <h1 className="lobby__title">Waymark</h1>
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
