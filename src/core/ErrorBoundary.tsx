import { Component, type ErrorInfo, type ReactNode } from 'react';

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
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <main className="lesson__card" role="alert" style={{ margin: '2rem auto', maxWidth: 560 }}>
        <h1>Something went wrong on this screen</h1>
        <p>Your saved progress is safe.</p>
        <p>
          <a href="/">Back to the square</a>{' '}
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
