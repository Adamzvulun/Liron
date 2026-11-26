import './core/strictCsp.ts';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './core/fonts.ts';
import './core/theme.css';
import './core/grounds.css';
import { App } from './core/App.tsx';
import { ErrorBoundary } from './core/ErrorBoundary.tsx';
import { watchForErrors } from './core/errorReport.ts';

const root = document.getElementById('root');
if (!root) throw new Error('Missing #root element');

watchForErrors();

createRoot(root).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);
