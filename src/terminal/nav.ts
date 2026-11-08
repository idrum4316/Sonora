import { create } from 'zustand';
import { useArtPalette } from '../core/artPalette';
import { addRecentSearch, loadRecentSearches } from '../core/recentSearches';
import { useStore } from '../core/store';
import {
  getAlbum, getAllAlbums, getArtist, getArtists, getGenres, getPlaylist, getPlaylists, getScanStatus, getStarred, ping, search3,
  startScan, type Artist, type ScanStatus, type Song, type SubsonicConfig,
} from '../core/subsonic';
import {
  albumItem, artistItem, artistPageItems, artistSummary, childrenKey, detailLabel, detailSummary, loadChildren,
  nowPlayingItems, settingsItems, songItem, upNextSummary, withStarred, wrapText,
  type Item,
} from './items';

/** Height of one row of the character grid in pixels. --t-row in terminal.css must match, for the connect screen. */
export const ROW_HEIGHT = 18;
/** Width of one character cell in pixels. terminal.css sizes the font so that 1ch is exactly this. */
export const CELL_WIDTH = 8;

export type ViewId = 'albums' | 'artists' | 'playlists' | 'genres' | 'favorites' | 'queue' | 'now' | 'search' | 'settings';
export const VIEWS: { id: ViewId; label: string; key: string }[] = [
  { id: 'albums', label: 'albums', key: '1' },
  { id: 'artists', label: 'artists', key: '2' },
  { id: 'playlists', label: 'playlists', key: '3' },
  { id: 'genres', label: 'genres', key: '4' },
  { id: 'favorites', label: 'favorites', key: '5' },
  { id: 'queue', label: 'queue', key: '6' },
  { id: 'now', label: 'now', key: '7' },
  { id: 'search', label: 'search', key: '/' },
  { id: 'settings', label: 'settings', key: '8' },
];

export type AlbumSort = 'newest' | 'recent' | 'frequent' | 'random';
const ALBUM_SORTS: AlbumSort[] = ['newest', 'recent', 'frequent', 'random'];

export type Focus = 'nav' | 'list' | 'detail' | 'input';

export interface PaneState {
  items: Item[];
  cursor: number;
  loading: boolean;
  error: string | null;
  /** A line about the whole list, shown above it. */
  summary?: string;
}
export const emptyPane: PaneState = { items: [], cursor: 0, loading: false, error: null };

/** A modal box over the panes. Pick rows are `action` items, so choosing one just runs it. */
export type Dialog =
  | { kind: 'pick'; title: string; pane: PaneState }
  | { kind: 'prompt'; title: string; label: string; submitLabel: string; onSubmit: (value: string) => void }
  | { kind: 'confirm'; title: string; message: string; confirmLabel: string; onConfirm: () => void };

/**
 * What the list pane shows. `load` fetches it once; `live` derives it from the store on every change.
 * `summary` is the line above the list.
 */
interface Screen {
  key: string;
  title: string;
  load?: (config: SubsonicConfig) => Promise<Item[]>;
  live?: () => { items: Item[]; detail: Item[]; detailTitle: string; detailSummary?: string };
  summary?: (items: Item[]) => string | undefined;
}

interface NavState {
  view: ViewId;
  screen: Screen;
  back: { screen: Screen; cursor: number }[];
  focus: Focus;
  list: PaneState;
  detail: PaneState;
  detailTitle: string;
  albumSort: AlbumSort;
  searchQuery: string;
  helpOpen: boolean;
  dialog: Dialog | null;
  /** The server's type and version, or null until they've loaded. */
  server: string | null;
  /** The scan state, or null if it isn't known. */
  scan: ScanStatus | null;
  /** `id` tells two identical messages apart, so the second one still shows as new. */
  status: { id: number; text: string; isError: boolean } | null;
}

const albumsScreen = (sort: AlbumSort): Screen => ({
  key: `albums:${sort}`,
  title: `albums · ${sort}`,
  load: async config => (await getAllAlbums(config, sort)).map(albumItem),
});

function artistScreen(artist: Pick<Artist, 'id' | 'name'>): Screen {
  return {
    key: `artist:${artist.id}:albums`,
    title: artist.name,
    load: async config => artistPageItems(config, await getArtist(config, artist.id)),
    summary: artistSummary,
  };
}

/** An album by itself, for when its artist's list doesn't include it. */
function albumScreen(album: { id: string; name: string }): Screen {
  return {
    key: `album:${album.id}`,
    title: album.name,
    load: async config => [albumItem(await getAlbum(config, album.id))],
  };
}

function viewScreen(view: ViewId, albumSort: AlbumSort): Screen {
  switch (view) {
    case 'albums':
      return albumsScreen(albumSort);
    case 'artists':
      return { key: view, title: view, load: async c => (await getArtists(c)).map(artistItem) };
    case 'playlists':
      return { key: view, title: view, load: async c => (await getPlaylists(c)).map(playlist => ({ kind: 'playlist', playlist })) };
    case 'genres':
      return { key: view, title: view, load: async c => (await getGenres(c)).map(genre => ({ kind: 'genre', genre })) };
    case 'favorites':
      return {
        key: view,
        title: view,
        load: async c => {
          const { artist, album, song } = await getStarred(c);
          return [...(artist ?? []).map(artistItem), ...(album ?? []).map(albumItem), ...(song ?? []).map(songItem)];
        },
      };
    case 'queue':
      return {
        key: view,
        title: view,
        live: () => {
          const { queue, playHistory } = useStore.getState();
          return { items: queue.map(songItem), detail: playHistory.map(songItem), detailTitle: 'history' };
        },
        summary: () => {
          const { queue, queueIndex } = useStore.getState();
          const upNext = upNextSummary(queue, queueIndex);
          return upNext && `up next · ${upNext}`;
        },
      };
    case 'now':
      return {
        key: view,
        title: 'now playing',
        live: () => {
          const { currentTrack: song, queue, queueIndex } = useStore.getState();
          const items = song ? nowPlayingItems(song, { artist: () => openArtistOf(song), album: () => openAlbumOf(song) }) : [];
          return {
            items,
            detail: queue.slice(queueIndex + 1).map(songItem),
            detailTitle: 'up next',
            detailSummary: upNextSummary(queue, queueIndex),
          };
        },
      };
    case 'settings':
      return {
        key: view,
        title: view,
        live: () => {
          const { server, scan } = get();
          const items = settingsItems({ notify: text => setStatus(text), server, scan, startScan: startLibraryScan });
          return { items, detail: [], detailTitle: 'details' };
        },
      };
    case 'search':
      return { key: view, title: view };
  }
}

export const useNav = create<NavState>(() => ({
  view: 'albums',
  screen: albumsScreen('newest'),
  back: [],
  focus: 'list',
  list: emptyPane,
  detail: emptyPane,
  detailTitle: 'details',
  albumSort: 'newest',
  searchQuery: '',
  helpOpen: false,
  dialog: null,
  server: null,
  scan: null,
  status: null,
}));
const get = useNav.getState;
const set = useNav.setState;

/** The view whose own list is showing, or null if something opened from it has replaced that list. */
export function rootView(nav: Pick<NavState, 'view' | 'back'>): ViewId | null {
  return nav.back.length ? null : nav.view;
}

// Loaded lists, kept for the session so moving between views is instant. `R` reloads.
const listCache = new Map<string, Item[]>();
const childCache = new Map<string, Item[]>();

const clamp = (n: number, max: number) => Math.max(0, Math.min(n, max));
const errorText = (e: unknown) => (e instanceof Error ? e.message : 'request failed');

// ── Status line ──────────────────────────────────────────────────────────────
let statusTimer: ReturnType<typeof setTimeout> | undefined;
let statusId = 0;

export function setStatus(text: string, isError = false) {
  clearTimeout(statusTimer);
  set({ status: { id: ++statusId, text, isError } });
  statusTimer = setTimeout(() => set({ status: null }), 4000);
}

// ── Detail pane ──────────────────────────────────────────────────────────────
let detailToken = 0;
let detailTimer: ReturnType<typeof setTimeout> | undefined;

function cancelDetail() {
  clearTimeout(detailTimer);
  ++detailToken;
}

// How many cells wide a line of prose can be in the detail pane. The pane reports it as it resizes.
let proseColumns = 60;

function setDetailItems(raw: Item[], title: string, summary?: string) {
  const items = wrapText(raw, proseColumns);
  set(s => ({ detail: { ...emptyPane, items, summary, cursor: clamp(s.detail.cursor, items.length - 1) }, detailTitle: title }));
}

/** Rewraps any prose in the detail pane to fit a new width. */
export function setProseColumns(columns: number) {
  if (columns === proseColumns) return;
  proseColumns = columns;
  const { screen, list, detail } = get();
  const item = list.items[list.cursor];
  const key = item && !screen.live ? childrenKey(item) : null;
  const cached = key ? childCache.get(key) : undefined;
  if (cached && !detail.loading && cached.some(child => child.kind === 'text')) {
    setDetailItems(cached, detailLabel(item), detailSummary(item, cached));
  }
}

/** Loads the selected item's children, after a short wait so holding `j` doesn't flood the server. */
function scheduleDetail() {
  cancelDetail();
  const token = detailToken;
  const { screen, list } = get();
  if (screen.live) return;
  const item = list.items[list.cursor];
  if (!item) {
    set({ detail: emptyPane, detailTitle: 'details' });
    return;
  }

  const title = detailLabel(item);
  const key = childrenKey(item);
  const cached = key ? childCache.get(key) : undefined;
  set(s => ({ detail: { ...s.detail, loading: !cached, error: null, cursor: 0 } }));
  if (cached) {
    setDetailItems(cached, title, detailSummary(item, cached));
    return;
  }

  detailTimer = setTimeout(async () => {
    const config = useStore.getState().config;
    if (!config) return;
    try {
      const items = await loadChildren(config, item);
      if (key) childCache.set(key, items);
      if (token === detailToken) setDetailItems(items, title, detailSummary(item, items));
    } catch (e) {
      if (token === detailToken) set({ detail: { ...emptyPane, error: errorText(e) }, detailTitle: title });
    }
  }, 120);
}

// ── List pane ────────────────────────────────────────────────────────────────
let listToken = 0;

function refreshLive() {
  const { screen, list, focus } = get();
  if (!screen.live) return;
  const { items, detail, detailTitle, detailSummary: summary } = screen.live();
  set({ list: { ...emptyPane, items, cursor: clamp(list.cursor, items.length - 1) } });
  setDetailItems(detail, detailTitle, summary);
  if (focus === 'detail' && !detail.length) set({ focus: 'list' });
}

async function loadList(cursor = 0, force = false) {
  const token = ++listToken;
  const { screen, searchQuery } = get();
  const config = useStore.getState().config;
  cancelDetail();
  if (screen.key === 'search') {
    const query = searchQuery.trim();
    set({ detail: emptyPane, detailTitle: 'details' });
    if (!query) {
      showRecentSearches(cursor);
      return;
    }
    set({ list: { ...emptyPane, loading: true } });
    await runSearch(query, cursor);
    return;
  }
  if (screen.live) {
    set(s => ({ list: { ...s.list, cursor } }));
    refreshLive();
    return;
  }
  if (!screen.load || !config) return;

  const cached = force ? undefined : listCache.get(screen.key);
  if (cached) {
    set({ list: { ...emptyPane, items: cached, cursor: clamp(cursor, cached.length - 1) } });
    scheduleDetail();
    return;
  }

  set({ list: { ...emptyPane, loading: true }, detail: emptyPane, detailTitle: 'details' });
  try {
    const items = await screen.load(config);
    listCache.set(screen.key, items);
    if (token !== listToken) return;
    set({ list: { ...emptyPane, items, cursor: clamp(cursor, items.length - 1) } });
    scheduleDetail();
  } catch (e) {
    if (token === listToken) set({ list: { ...emptyPane, error: errorText(e) } });
  }
}

// ── Search ───────────────────────────────────────────────────────────────────
let searchTimer: ReturnType<typeof setTimeout> | undefined;

function showRecentSearches(cursor = 0) {
  ++listToken;
  const items: Item[] = loadRecentSearches().map(term => ({ kind: 'recent', term }));
  set({ list: { ...emptyPane, items, cursor: clamp(cursor, items.length - 1) }, detail: emptyPane, detailTitle: 'details' });
}

async function runSearch(query: string, cursor = 0) {
  const config = useStore.getState().config;
  if (!config) return;
  const token = ++listToken;
  set(s => ({ list: { ...s.list, loading: true, error: null } }));
  try {
    const result = await search3(config, query, 10, 20, 50);
    if (token !== listToken) return;
    addRecentSearch(query);
    const items = [
      ...(result.artist ?? []).map(artistItem),
      ...(result.album ?? []).map(albumItem),
      ...(result.song ?? []).map(songItem),
    ];
    set({ list: { ...emptyPane, items, cursor: clamp(cursor, items.length - 1) } });
    scheduleDetail();
  } catch (e) {
    if (token === listToken) set({ list: { ...emptyPane, error: errorText(e) } });
  }
}

export function setSearchQuery(searchQuery: string) {
  set({ searchQuery });
  clearTimeout(searchTimer);
  const trimmed = searchQuery.trim();
  if (!trimmed) showRecentSearches();
  else searchTimer = setTimeout(() => void runSearch(trimmed), 300);
}

export function refreshRecentSearches() {
  if (get().view === 'search' && !get().searchQuery.trim()) showRecentSearches();
}

// ── Navigation ───────────────────────────────────────────────────────────────
export function openView(view: ViewId, focus: Focus = 'list') {
  clearTimeout(searchTimer);
  set({ view, screen: viewScreen(view, get().albumSort), back: [], focus });
  const cursor = view === 'queue' ? useStore.getState().queueIndex : 0;
  void loadList(cursor);
  if (view === 'settings') void loadServerStatus();
}

/** `/`: opens the search view with an empty query, ready to type. */
export function startNewSearch() {
  set({ searchQuery: '' });
  openView('search', 'input');
}

function pushScreen(screen: Screen) {
  // A search still waiting to run would replace the new screen's list.
  clearTimeout(searchTimer);
  const { screen: current, list, back } = get();
  set({ screen, back: [...back, { screen: current, cursor: list.cursor }], focus: 'list' });
}

export function pushArtist(artist: Pick<Artist, 'id' | 'name'>) {
  const screen = artistScreen(artist);
  if (get().screen.key === screen.key) {
    setFocus('list');
    return;
  }
  pushScreen(screen);
  void loadList();
}

let albumToken = 0;

/**
 * Selects an album, so its tracks show beside it. If it isn't in the list, opens its artist's
 * albums to show it among them. That's the album's artist, as a track's own may not list it.
 */
export async function pushAlbum(id: string, name: string) {
  const config = useStore.getState().config;
  if (!config) return;
  const token = ++albumToken;
  const isThisAlbum = (item: Item) => item.kind === 'album' && item.album.id === id;

  const listed = get().list.items.findIndex(isThisAlbum);
  if (listed >= 0) {
    setFocus('list');
    setCursor('list', listed);
    return;
  }

  const from = get().screen;
  try {
    const album = await getAlbum(config, id);
    if (token !== albumToken || get().screen !== from) return;
    const screen = album.artistId ? artistScreen({ id: album.artistId, name: album.artist }) : albumScreen(album);
    pushScreen(screen);
    await loadList();
    if (token !== albumToken || get().screen !== screen) return;
    const index = get().list.items.findIndex(isThisAlbum);
    if (index >= 0) {
      setCursor('list', index);
    } else {
      set({ screen: albumScreen(album) });
      await loadList();
    }
  } catch (e) {
    if (token === albumToken) setStatus(`couldn't open ${name}: ${errorText(e)}`, true);
  }
}

/** Opens an artist, or reports that the server didn't say which artist `of` belongs to. */
export function openArtist(id: string, name: string, of: string) {
  if (id) pushArtist({ id, name });
  else setStatus(`the server didn't link ${of} to an artist`, true);
}

export function openArtistOf(song: Song) {
  openArtist(song.artistId, song.artist, song.title);
}

export function openAlbumOf(song: Song) {
  if (song.albumId) void pushAlbum(song.albumId, song.album);
  else setStatus(`the server didn't link ${song.title} to an album`, true);
}

export function setFocus(focus: Focus) {
  set({ focus });
}

/** Esc and `h`: leaves the detail pane, then the drill-down stack, then the list. */
export function goBack() {
  const { focus, back } = get();
  if (focus === 'detail') {
    set({ focus: 'list' });
  } else if (back.length) {
    const previous = back[back.length - 1];
    set({ screen: previous.screen, back: back.slice(0, -1), focus: 'list' });
    void loadList(previous.cursor);
  } else if (focus === 'list') {
    set({ focus: 'nav' });
  }
}

/** Moves the cursor of a pane to an exact row. */
export function setCursor(pane: 'list' | 'detail', index: number) {
  const current = get()[pane];
  const cursor = clamp(index, current.items.length - 1);
  if (cursor === current.cursor) return;
  set({ [pane]: { ...current, cursor } });
  if (pane === 'list') scheduleDetail();
}

export function cycleAlbumSort() {
  const { albumSort } = get();
  if (rootView(get()) !== 'albums') return;
  const next = ALBUM_SORTS[(ALBUM_SORTS.indexOf(albumSort) + 1) % ALBUM_SORTS.length];
  set({ albumSort: next, screen: albumsScreen(next), back: [] });
  void loadList();
}

export function reload() {
  const { list, view } = get();
  const selected = list.items[list.cursor];
  const key = selected ? childrenKey(selected) : null;
  if (key) childCache.delete(key);
  if (view === 'settings') void loadServerStatus();
  void loadList(list.cursor, true);
}

/** Updates a star everywhere it's shown, so every pane and cached list agrees. */
export function patchStarred(id: string, starred: string | undefined) {
  const patch = (items: Item[]) => items.map(item => withStarred(item, id, starred));
  for (const cache of [listCache, childCache]) {
    for (const [key, items] of cache) cache.set(key, patch(items));
  }
  listCache.delete('favorites');
  set(s => ({
    list: { ...s.list, items: patch(s.list.items) },
    detail: { ...s.detail, items: patch(s.detail.items) },
  }));
}

// ── Library scan ─────────────────────────────────────────────────────────────
const SCAN_POLL_MS = 2000;
let scanTimer: ReturnType<typeof setTimeout> | undefined;
// Bumped whenever a new request takes over, so a slower, older one can't overwrite its result.
let scanToken = 0;

function setScan(scan: ScanStatus | null) {
  set({ scan });
  refreshLive();
}

function finishScan(scan: ScanStatus) {
  // Anything cached may be out of date now. The open list stays until `R` or the next visit.
  listCache.clear();
  childCache.clear();
  setStatus(scan.count != null ? `library scan finished · ${scan.count.toLocaleString()} items` : 'library scan finished');
}

/** Checks on the scan every couple of seconds until it ends, whichever view is open. */
function watchScan() {
  clearTimeout(scanTimer);
  const token = ++scanToken;
  scanTimer = setTimeout(async () => {
    const config = useStore.getState().config;
    if (!config) return;
    try {
      const scan = await getScanStatus(config);
      if (token !== scanToken) return;
      setScan(scan);
      if (scan.scanning) watchScan();
      else finishScan(scan);
    } catch (e) {
      if (token !== scanToken) return;
      setScan(null);
      setStatus(`couldn't check the scan: ${errorText(e)}`, true);
    }
  }, SCAN_POLL_MS);
}

export async function startLibraryScan(fullScan: boolean) {
  const config = useStore.getState().config;
  if (!config) return;
  if (get().scan?.scanning) {
    setStatus('a scan is already running');
    return;
  }
  clearTimeout(scanTimer);
  const token = ++scanToken;
  setScan({ scanning: true });
  try {
    await startScan(config, fullScan);
    if (token !== scanToken) return;
    setStatus(`${fullScan ? 'full' : 'quick'} scan started`);
    // Follow it even if this reply says it isn't running: a fast scan may already be done.
    watchScan();
  } catch (e) {
    if (token !== scanToken) return;
    setScan({ scanning: false });
    setStatus(`couldn't start the scan: ${errorText(e)}`, true);
  }
}

/** Loads what the settings view shows about the server, and follows a scan that's already running. */
async function loadServerStatus() {
  const config = useStore.getState().config;
  if (!config) return;
  const token = scanToken;
  const [info, scan] = await Promise.allSettled([ping(config), getScanStatus(config)]);
  if (useStore.getState().config !== config) return;
  const server = info.status === 'fulfilled' ? [info.value.type, info.value.serverVersion].filter(Boolean).join(' ') : '';
  set({ server: server || 'unknown' });
  if (token === scanToken) {
    set({ scan: scan.status === 'fulfilled' ? scan.value : null });
    if (scan.status === 'fulfilled' && scan.value.scanning) watchScan();
  }
  refreshLive();
}

// ── Playlists ────────────────────────────────────────────────────────────────
/** Brings a playlist's row and tracks up to date after a change, without reloading the list. */
export async function refreshPlaylist(id: string) {
  const config = useStore.getState().config;
  if (!config) return;
  const key = `playlist:${id}`;
  childCache.delete(key);
  try {
    const { entry, ...playlist } = await getPlaylist(config, id);
    const tracks = (entry ?? []).map(songItem);
    const patch = (items: Item[]) => items.map((item): Item => (
      item.kind === 'playlist' && item.playlist.id === id ? { kind: 'playlist', playlist } : item
    ));
    childCache.set(key, tracks);
    const cached = listCache.get('playlists');
    if (cached) listCache.set('playlists', patch(cached));

    const { list, focus, detail } = get();
    const selected = list.items[list.cursor];
    const showing = selected?.kind === 'playlist' && selected.playlist.id === id;
    set({ list: { ...list, items: patch(list.items) } });
    if (showing) {
      cancelDetail();
      set({
        detail: {
          ...emptyPane,
          items: tracks,
          summary: detailSummary({ kind: 'playlist', playlist }, tracks),
          cursor: clamp(detail.cursor, tracks.length - 1),
        },
        focus: focus === 'detail' && !tracks.length ? 'list' : focus,
      });
    }
  } catch {
    // The change itself went through. Reload this list the next time it's opened.
    listCache.delete('playlists');
  }
}

/** Takes a deleted playlist out of the list and caches. */
export function dropPlaylist(id: string) {
  const without = (items: Item[]) => items.filter(item => !(item.kind === 'playlist' && item.playlist.id === id));
  childCache.delete(`playlist:${id}`);
  const cached = listCache.get('playlists');
  if (cached) listCache.set('playlists', without(cached));
  set(({ list }) => {
    const items = without(list.items);
    return { list: { ...list, items, cursor: clamp(list.cursor, items.length - 1) } };
  });
  scheduleDetail();
}

/** Reloads the playlists after one is created, and selects it if that view is open. */
export async function showCreatedPlaylist(id: string | undefined) {
  listCache.delete('playlists');
  if (rootView(get()) !== 'playlists') return;
  await loadList(get().list.cursor, true);
  if (rootView(get()) !== 'playlists') return;
  setFocus('list');
  const index = get().list.items.findIndex(item => item.kind === 'playlist' && item.playlist.id === id);
  if (index >= 0) setCursor('list', index);
}

// ── Dialogs ──────────────────────────────────────────────────────────────────
export function openDialog(dialog: Dialog) {
  set({ dialog });
}

export function closeDialog() {
  set({ dialog: null });
}

export function setDialogCursor(index: number) {
  const { dialog } = get();
  if (dialog?.kind !== 'pick' || !dialog.pane.items.length) return;
  set({ dialog: { ...dialog, pane: { ...dialog.pane, cursor: clamp(index, dialog.pane.items.length - 1) } } });
}

/** Runs a row of the open pick dialog. */
export function runDialogRow(index: number) {
  const { dialog } = get();
  const row = dialog?.kind === 'pick' ? dialog.pane.items[index] : undefined;
  if (row?.kind === 'action') row.run();
}

// ── Startup ──────────────────────────────────────────────────────────────────
/** Opens the first view and keeps live views in step with the store. Returns a cleanup function. */
export function startNav(): () => void {
  listCache.clear();
  childCache.clear();
  set({ searchQuery: '', helpOpen: false, dialog: null, server: null, scan: null, status: null });
  openView('albums');
  const unsubscribe = useStore.subscribe((s, prev) => {
    const changed = s.currentTrack !== prev.currentTrack || s.queue !== prev.queue || s.queueIndex !== prev.queueIndex
      || s.playHistory !== prev.playHistory
      || s.theme !== prev.theme || s.accentColor !== prev.accentColor
      || s.scrobbleThreshold !== prev.scrobbleThreshold;
    if (changed) refreshLive();
  });
  // The settings view's album swatch shows the art's color once it loads.
  const unsubscribePalette = useArtPalette.subscribe(refreshLive);
  return () => {
    unsubscribe();
    unsubscribePalette();
    clearTimeout(scanTimer);
    ++scanToken;
  };
}
