import { Component, type ErrorInfo, type ReactNode } from 'react';
import { WaymarkPost } from './auth/Scenes.tsx';
import { reportError } from './errorReport.ts';

/**
 * If a screen throws while drawing, show a way back instead of a blank page (2026-11-04 QA
 * review, B3). Progress is saved by each activity as it finishes, so reloading loses nothing
 * already saved.
 */
export class ErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Waymark screen failed', error, info.componentStack);
    reportError(error);
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <main className="place-screen" data-ground="cobble" role="alert">
        <h1 className="place-screen__title">Something went wrong on this screen</h1>
        <WaymarkPost lit={false} />
        <p className="place-screen__soon">
          Your saved progress is safe. <a href="/">Back to the square</a>{' '}
          <button type="button" className="place__retry" onClick={() => window.location.reload()}>
            Reload
          </button>
        </p>
      </main>
    );
  }
}

/**
 * A place whose screen couldn't load or draw (a dropped connection while its code loads, say)
 * says so inside the place, with the way back still there, instead of replacing the whole app
 * (review, 2026-11-15). A failed load stays failed until the page reloads, so it offers that.
 */
export class PlaceBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Waymark place failed', error, info.componentStack);
    reportError(error);
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <p className="place__loading" role="alert">
        This place couldn’t open. Your saved progress is safe.{' '}
        <button type="button" className="place__retry" onClick={() => window.location.reload()}>
          Reload
        </button>
      </p>
    );
  }
}

/**
 * Something extra on a screen, like the guide's cards and lines (the-guide.md, #411): if its code
 * can't load or it can't draw, it simply isn't shown, and the screen around it carries on.
 */
export class QuietBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Waymark extra failed', error, info.componentStack);
    reportError(error);
  }

  render() {
    return this.state.failed ? null : this.props.children;
  }
}
