import { create } from 'zustand';
import { useStore } from '../core/store';
import { getAllAlbums, type Album } from '../core/subsonic';
import { generatedSample, getSample, requestSample, type ArtSample } from './art';

/**
 * The gallery's own state: the whole album list (the atlas shows all of it at once), how it's arranged,
 * and what's lit. Lives here rather than in the core store, since only this UI needs every album up front.
 */

export type Arrangement = 'spectrum' | 'timeline' | 'alphabet' | 'rings';

export const ARRANGEMENTS: { id: Arrangement; label: string; hint: string }[] = [
  { id: 'spectrum', label: 'Spectrum', hint: 'Sorted by color, bright to dark' },
  { id: 'timeline', label: 'Timeline', hint: 'A skyline of albums by year' },
  { id: 'alphabet', label: 'Alphabet', hint: 'Grouped by artist, A to Z' },
  { id: 'rings', label: 'Rings', hint: 'Newest at the heart, older rings around it, each by color' },
];

interface GalleryState {
  albums: Album[];
  status: 'idle' | 'loading' | 'ready' | 'error';
  error: string | null;
  arrangement: Arrangement;
  query: string;
  starredOnly: boolean;
  genre: string | null;
  touring: boolean;
  /** Bumped to ask the atlas to fly to the playing album. */
  locateTick: number;

  load: () => Promise<void>;
  setArrangement: (a: Arrangement) => void;
  setQuery: (q: string) => void;
  setStarredOnly: (v: boolean) => void;
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
export function litMask(albums: Album[], query: string, starredOnly: boolean, genre: string | null): Uint8Array | null {
  const q = fold(query.trim());
  if (!q && !starredOnly && !genre) return null;
  const words = q.split(/\s+/).filter(Boolean);
  const mask = new Uint8Array(albums.length);
  albums.forEach((a, i) => {
    if (starredOnly && !a.starred) return;
    if (genre && a.genre !== genre) return;
    if (words.length) {
      const hay = fold(`${a.name} ${a.artist} ${a.year ?? ''} ${a.genre ?? ''}`);
      if (!words.every(w => hay.includes(w))) return;
    }
    mask[i] = 1;
  });
  return mask;
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
