import { create } from 'zustand';
import { fmtAgo, plural } from '../core/format';
import { useStore } from '../core/store';
import { getAllAlbums, type Album } from '../core/subsonic';
import { generatedSample, getSample, requestSample, type ArtSample } from './art';

/**
 * The gallery's own state: the whole album list (the atlas shows all of it at once), how it's arranged,
 * and what's lit. Lives here rather than in the core store, since only this UI needs every album up front.
 */

export type Arrangement = 'spectrum' | 'timeline' | 'alphabet' | 'rings' | 'heat' | 'played';

export const ARRANGEMENTS: { id: Arrangement; label: string; hint: string }[] = [
  { id: 'spectrum', label: 'Spectrum', hint: 'Sorted by color, bright to dark' },
  { id: 'timeline', label: 'Timeline', hint: 'A skyline of albums by year' },
  { id: 'alphabet', label: 'Alphabet', hint: 'Grouped by artist, A to Z' },
  { id: 'rings', label: 'Rings', hint: 'Newest at the heart, older rings around it, each by color' },
  { id: 'heat', label: 'Heat', hint: 'Most listened at the heart, sized by time played' },
  { id: 'played', label: 'Last played', hint: 'A skyline of when you last played each album' },
];

/** Arrangements that show listening, which only means something if the server counts plays. */
export const LISTENING_ARRANGEMENTS: Arrangement[] = ['heat', 'played'];

interface GalleryState {
  albums: Album[];
  status: 'idle' | 'loading' | 'ready' | 'error';
  error: string | null;
  arrangement: Arrangement;
  query: string;
  starredOnly: boolean;
  /** Light up only albums never played. */
  unheardOnly: boolean;
  genre: string | null;
  touring: boolean;
  /** Bumped to ask the atlas to fly to the playing album. */
  locateTick: number;

  load: () => Promise<void>;
  setArrangement: (a: Arrangement) => void;
  setQuery: (q: string) => void;
  setStarredOnly: (v: boolean) => void;
  setUnheardOnly: (v: boolean) => void;
  setGenre: (g: string | null) => void;
  setTouring: (v: boolean) => void;
  locate: () => void;
  patchAlbum: (id: string, patch: Partial<Album>) => void;
}

const SAVED_KEY = 'sonora-gallery-view';

function savedArrangement(): Arrangement {
  try {
    const saved = localStorage.getItem(SAVED_KEY);
    if (saved && ARRANGEMENTS.some(a => a.id === saved)) return saved as Arrangement;
  } catch {
    // Fall through to the default.
  }
  return 'spectrum';
}

export const useGallery = create<GalleryState>((set, get) => ({
  albums: [],
  status: 'idle',
  error: null,
  arrangement: savedArrangement(),
  query: '',
  starredOnly: false,
  unheardOnly: false,
  genre: null,
  touring: false,
  locateTick: 0,

  load: async () => {
    const config = useStore.getState().config;
    if (!config || get().status === 'loading') return;
    set({ status: 'loading', error: null });
    try {
      const albums = await getAllAlbums(config, 'newest');
      set({ albums, status: 'ready' });
      // Read every cover's colors in the background, newest first.
      for (const album of albums) if (album.coverArt) requestSample(album.coverArt);
    } catch (e) {
      set({ status: 'error', error: e instanceof Error ? e.message : 'Could not load the library' });
    }
  },

  setArrangement: (arrangement) => {
    try { localStorage.setItem(SAVED_KEY, arrangement); } catch { /* not remembered */ }
    set({ arrangement });
  },
  setQuery: (query) => set({ query }),
  setStarredOnly: (starredOnly) => set({ starredOnly }),
  setUnheardOnly: (unheardOnly) => set({ unheardOnly }),
  setGenre: (genre) => set({ genre }),
  setTouring: (touring) => set({ touring }),
  locate: () => set(s => ({ locateTick: s.locateTick + 1 })),
  patchAlbum: (id, patch) => set(s => ({ albums: s.albums.map(a => a.id === id ? { ...a, ...patch } : a) })),
}));

const generated = new Map<string, ArtSample>();

/** An album's colors: read from its cover, or made up from its name when it has none. */
export function albumSample(album: Album): ArtSample | null {
  if (album.coverArt) return getSample(album.coverArt);
  let s = generated.get(album.id);
  if (!s) {
    s = generatedSample(album.id);
    generated.set(album.id, s);
  }
  return s;
}

/** The atlas key of an album's 3×3 grid. */
export function albumAtlasId(album: Album): string {
  return album.coverArt ?? `gen:${album.id}`;
}

const fold = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/** Which albums the current search and filters light up, or null when everything is lit. */
export function litMask(
  albums: Album[], query: string, starredOnly: boolean, genre: string | null, unheardOnly: boolean,
): Uint8Array | null {
  const q = fold(query.trim());
  if (!q && !starredOnly && !genre && !unheardOnly) return null;
  const words = q.split(/\s+/).filter(Boolean);
  const mask = new Uint8Array(albums.length);
  albums.forEach((a, i) => {
    if (starredOnly && !a.starred) return;
    if (unheardOnly && wasPlayed(a)) return;
    if (genre && a.genre !== genre) return;
    if (words.length) {
      const hay = fold(`${a.name} ${a.artist} ${a.year ?? ''} ${a.genre ?? ''}`);
      if (!words.every(w => hay.includes(w))) return;
    }
    mask[i] = 1;
  });
  return mask;
}

// ── Listening ────────────────────────────────────────────────────────────────
/** When the album was last played, or NaN if never. */
export function lastPlayedAt(album: Album): number {
  return album.playCount && album.played ? Date.parse(album.played) : NaN;
}

export const wasPlayed = (album: Album) => !!album.playCount;

/**
 * Roughly how long the album has played, in seconds. The server counts plays of an album's tracks,
 * so a long album racks up plays faster than a single; time listened weighs them fairly.
 */
export function listenedSeconds(album: Album): number {
  return album.playCount && album.songCount ? (album.playCount * album.duration) / album.songCount : 0;
}

/** Whether the server reports play counts at all. Ones that don't leave the field out. */
export const countsPlays = (albums: Album[]) => albums.some(a => a.playCount !== undefined);

/** "41 plays · 3.2 hr · 2 days ago", or "never played". */
export function listeningLine(album: Album): string {
  if (!wasPlayed(album)) return 'never played';
  const secs = listenedSeconds(album);
  const hours = secs / 3600;
  const time = hours >= 1 ? `${hours < 10 ? hours.toFixed(1) : Math.round(hours)} hr` : `${Math.max(1, Math.round(secs / 60))} min`;
  const at = lastPlayedAt(album);
  return [plural(album.playCount!, 'play'), time, Number.isFinite(at) ? fmtAgo(at) : ''].filter(Boolean).join(' · ');
}

/** Genres by how many albums they hold, most first. */
export function genresOf(albums: Album[]): { name: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const a of albums) if (a.genre) counts.set(a.genre, (counts.get(a.genre) ?? 0) + 1);
  return [...counts.entries()].map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count);
}

/** Artist name for sorting, ignoring a leading "The". */
export function sortName(name: string): string {
  return fold(name).replace(/^the\s+/, '').trim();
}
