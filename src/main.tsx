import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './core/fonts.ts';
import './core/theme.css';
import { App } from './core/App.tsx';
import { ErrorBoundary } from './core/ErrorBoundary.tsx';

const root = document.getElementById('root');
if (!root) throw new Error('Missing #root element');

createRoot(root).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);
