// Whether the first page (docs/game/the-road.md §8) was closed on this device. Kept apart from
// the page itself, which loads only for a new player.
const CLOSED = 'waymark:first-page-closed';

/** Was the first page closed on this device? Private browsing may refuse the question. */
export function firstPageClosed(): boolean {
  try {
    return localStorage.getItem(CLOSED) === '1';
  } catch {
    return false;
  }
}

export function rememberFirstPageClosed() {
  try {
    localStorage.setItem(CLOSED, '1');
  } catch {
    // Without storage it shows again next visit, until a first step is done.
  }
}
