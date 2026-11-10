import { useSyncExternalStore } from 'react';

/**
 * Hash routes, so every view is reachable from /gallery/ without any server rewrites,
 * and the browser's back button walks the tour backwards.
 */
export type Route =
  | { view: 'atlas' }
  | { view: 'album'; id: string }
  | { view: 'artist'; id: string }
  | { view: 'stage' }
  | { view: 'playlists' }
  | { view: 'playlist'; id: string };

function parse(hash: string): Route {
  const [, view, id] = hash.replace(/^#/, '').split('/').map(decodeURIComponent);
  if (view === 'album' && id) return { view: 'album', id };
  if (view === 'artist' && id) return { view: 'artist', id };
  if (view === 'playlist' && id) return { view: 'playlist', id };
  if (view === 'playlists') return { view: 'playlists' };
  if (view === 'now') return { view: 'stage' };
  return { view: 'atlas' };
}

let current = parse(location.hash);
let key = location.hash;
const listeners = new Set<() => void>();
window.addEventListener('hashchange', () => {
  if (location.hash === key) return;
  key = location.hash;
  current = parse(key);
  listeners.forEach(l => l());
});

export function useRoute(): Route {
  return useSyncExternalStore(
    l => { listeners.add(l); return () => listeners.delete(l); },
    () => current,
  );
}

/** How many views deep the visitor went inside the gallery, so `back` never leaves the page. */
let depth = 0;

export function go(path: string) {
  if (location.hash === `#${path}`) return;
  depth++;
  location.hash = path;
}

export function back() {
  if (depth > 0) {
    depth--;
    history.back();
  } else {
    location.replace('#/');
  }
}

export const albumPath = (id: string) => `/album/${encodeURIComponent(id)}`;
export const artistPath = (id: string) => `/artist/${encodeURIComponent(id)}`;
export const playlistPath = (id: string) => `/playlist/${encodeURIComponent(id)}`;

// ── Shared-element flights ───────────────────────────────────────────────────
/**
 * Where a cover was on screen when it was clicked. The next view's hero cover starts there
 * and flies into place, so opening an album feels like stepping into its art.
 */
export interface Flight {
  coverArt?: string;
  rect: { left: number; top: number; width: number; height: number };
}

let pendingFlight: (Flight & { at: number }) | null = null;
/** A flight has to land soon after it took off; after that the view just appears. */
const FLIGHT_MS = 1200;

export function launch(flight: Flight) {
  pendingFlight = { ...flight, at: performance.now() };
}

/**
 * The flight headed for this cover, if one just took off. Reading it twice gives the same answer, so a
 * view rendered twice (as React's strict mode does) still flies.
 */
export function land(coverArt: string | undefined): Flight | null {
  const flight = pendingFlight;
  if (!flight || flight.coverArt !== coverArt || performance.now() - flight.at > FLIGHT_MS) return null;
  return flight;
}

/** Records where an element sits, then navigates. */
export function openFrom(el: Element | null, coverArt: string | undefined, path: string) {
  if (el) {
    const r = el.getBoundingClientRect();
    launch({ coverArt, rect: { left: r.left, top: r.top, width: r.width, height: r.height } });
  }
  go(path);
}
