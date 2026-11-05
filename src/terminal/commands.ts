import { plural } from '../core/format';
import { ACCENT_COLORS, useStore } from '../core/store';
import {
  addToPlaylist, createPlaylist, deletePlaylist, getPlaylist, getPlaylists, removeFromPlaylist, star, unstar,
  type Playlist, type Song,
} from '../core/subsonic';
import { removeRecentSearch } from '../core/recentSearches';
import { crossfade } from './motion';
import { holdsSongs, itemName, songItem, songsFor, songsIn, starTarget, type Item } from './items';
import {
  VIEWS, closeDialog, dropPlaylist, emptyPane, openAlbumOf, openArtist, openArtistOf, openDialog, openView, patchStarred,
  pushArtist, refreshPlaylist, refreshRecentSearches, rootView, setCursor, setFocus, setSearchQuery, setStatus, showCreatedPlaylist, useNav,
  type Dialog, type Focus, type PaneState,
} from './nav';

const errorText = (e: unknown) => (e instanceof Error ? e.message : 'request failed');

function activePane(): { pane: 'list' | 'detail'; item: Item | undefined } | null {
  const nav = useNav.getState();
  if (nav.focus !== 'list' && nav.focus !== 'detail') return null;
  const pane = nav[nav.focus];
  return { pane: nav.focus, item: pane.items[pane.cursor] };
}

export function moveBy(delta: number) {
  const nav = useNav.getState();
  if (nav.focus === 'nav') {
    const index = VIEWS.findIndex(v => v.id === nav.view);
    const next = Math.max(0, Math.min(index + delta, VIEWS.length - 1));
    if (next !== index) openView(VIEWS[next].id, 'nav');
  } else if (nav.focus === 'list' || nav.focus === 'detail') {
    setCursor(nav.focus, nav[nav.focus].cursor + delta);
  }
}

export function moveToEdge(edge: 'first' | 'last') {
  const nav = useNav.getState();
  if (nav.focus === 'list' || nav.focus === 'detail') {
    setCursor(nav.focus, edge === 'first' ? 0 : nav[nav.focus].items.length - 1);
  }
}

const PANE_ORDER: Focus[] = ['nav', 'list', 'detail'];

export function moveFocus(delta: 1 | -1, wrap = false) {
  const { focus, detail } = useNav.getState();
  const panes = detail.items.length ? PANE_ORDER : PANE_ORDER.slice(0, 2);
  const index = panes.indexOf(focus);
  const next = index + delta;
  if (next >= 0 && next < panes.length) setFocus(panes[next]);
  else if (wrap) setFocus(panes[(next + panes.length) % panes.length]);
}

function playSong(pane: 'list' | 'detail', cursor: number, item: Extract<Item, { kind: 'song' }>) {
  const nav = useNav.getState();
  const store = useStore.getState();
  if (rootView(nav) === 'queue') {
    if (pane === 'detail') store.playTrack(item.song);
    // A track can be queued twice, so the queue compares positions, not ids.
    else if (cursor === store.queueIndex && store.currentTrack) store.togglePlay();
    else store.playTrack(item.song, store.queue, cursor);
    return;
  }
  if (rootView(nav) === 'now') {
    // Up next starts right after the current track. A track can be queued twice, so go by position.
    store.playTrack(item.song, store.queue, store.queueIndex + 1 + cursor);
    return;
  }
  // Mixed lists like search results queue only their songs, so count songs before the cursor.
  const items = nav[pane].items;
  store.playOrToggle(item.song, songsIn(items), songsIn(items.slice(0, cursor)).length);
}

/** Enter: plays or opens whatever is selected. */
export async function activate() {
  const nav = useNav.getState();
  if (nav.focus === 'nav') {
    setFocus('list');
    return;
  }
  const active = activePane();
  if (!active?.item) return;
  const { pane, item } = active;
  const store = useStore.getState();
  const cursor = nav[pane].cursor;
  let started = true;

  switch (item.kind) {
    case 'song':
      playSong(pane, cursor, item);
      return;
    case 'artist':
      pushArtist(item.artist);
      return;
    case 'action':
    case 'link':
      item.run();
      return;
    case 'recent':
      setSearchQuery(item.term);
      return;
    case 'album':
      started = await store.playAlbum(item.album);
      break;
    case 'playlist':
      started = await store.playPlaylist(item.playlist);
      break;
    case 'genre': {
      started = false;
      if (store.config) {
        const songs = await songsFor(store.config, item).catch(() => []);
        if (songs.length) {
          store.playTrack(songs[0], songs, 0);
          started = true;
        }
      }
      break;
    }
    default:
      return;
  }
  if (!started) setStatus(`couldn't play ${itemName(item)}`, true);
}

/** `a` adds the selection to the end of the queue. `N` adds it after the current track. */
export async function enqueue(position: 'end' | 'next') {
  const active = activePane();
  const config = useStore.getState().config;
  if (!active?.item || !config) return;
  const { item } = active;
  if (!holdsSongs(item)) return;
  try {
    const songs = await songsFor(config, item);
    if (!songs.length) {
      setStatus(`${itemName(item)} has no tracks`, true);
      return;
    }
    const store = useStore.getState();
    if (!store.currentTrack) {
      // Nothing is loaded, so space would have nothing to resume. Start playing instead.
      store.playTrack(songs[0], [...store.queue, ...songs], store.queue.length);
      setStatus(`playing ${plural(songs.length, 'track')}`);
    } else if (position === 'end') {
      store.addMultipleToQueue(songs);
      setStatus(`added ${plural(songs.length, 'track')} to the queue`);
    } else {
      store.playMultipleNext(songs);
      setStatus(`playing ${plural(songs.length, 'track')} next`);
    }
  } catch {
    setStatus(`couldn't load ${itemName(item)}`, true);
  }
}

async function setStarred(item: Item) {
  const target = starTarget(item);
  const store = useStore.getState();
  if (!target || !store.config) return;
  const { id, starred } = target;
  const timestamp = new Date().toISOString();
  patchStarred(id, starred ? undefined : timestamp);
  let ok: boolean;
  if (item.kind === 'song') {
    ok = await store.setSongStarred(id, !starred);
  } else {
    ok = await (starred ? unstar(store.config, id) : star(store.config, id)).then(() => true, () => false);
  }
  if (!ok) {
    patchStarred(id, starred ? timestamp : undefined);
    setStatus(`couldn't update star on ${itemName(item)}`, true);
  }
}

export function starSelected() {
  const item = activePane()?.item;
  if (item) void setStarred(item);
}

export function starCurrent() {
  const { currentTrack } = useStore.getState();
  if (currentTrack) void setStarred({ kind: 'song', song: currentTrack });
}

export function seekBy(seconds: number) {
  const { currentTrack, currentTime, duration, seekTo } = useStore.getState();
  if (!currentTrack || !Number.isFinite(duration)) return;
  seekTo(Math.max(0, Math.min(currentTime + seconds, duration)));
}

export function changeVolume(delta: number) {
  const { volume, setVolume } = useStore.getState();
  setVolume(Math.round(Math.max(0, Math.min(volume + delta, 1)) * 100) / 100);
}

// ── Links ────────────────────────────────────────────────────────────────────
/** What `A` and `b` apply to: the selection, or in the now playing view, the current track. */
function linkTarget(): Item | undefined {
  const item = activePane()?.item;
  if (item?.kind === 'song' || item?.kind === 'album') return item;
  const { currentTrack } = useStore.getState();
  return rootView(useNav.getState()) === 'now' && currentTrack ? songItem(currentTrack) : undefined;
}

/** `A`: opens the artist of the selected song or album. */
export function goToArtist() {
  const item = linkTarget();
  if (item?.kind === 'song') openArtistOf(item.song);
  else if (item?.kind === 'album') openArtist(item.album.artistId, item.album.artist, item.album.name);
}

/** `b`: opens the album of the selected song. */
export function goToAlbum() {
  const item = linkTarget();
  if (item?.kind === 'song') openAlbumOf(item.song);
}

// ── Queue view ───────────────────────────────────────────────────────────────
function queueCursor(): number | null {
  const nav = useNav.getState();
  return rootView(nav) === 'queue' && nav.focus === 'list' ? nav.list.cursor : null;
}

/** `d`: removes the selection from wherever it's listed. */
export function removeSelected() {
  const nav = useNav.getState();
  const selected = activePane()?.item;
  if (selected?.kind === 'recent') {
    removeRecentSearch(selected.term);
    refreshRecentSearches();
    return;
  }
  if (nav.focus === 'list' && selected?.kind === 'playlist') {
    confirmDeletePlaylist(selected.playlist);
    return;
  }
  const parent = nav.list.items[nav.list.cursor];
  if (nav.focus === 'detail' && selected?.kind === 'song' && parent?.kind === 'playlist' && !nav.detail.loading) {
    void removeTrack(parent.playlist, nav.detail.cursor, selected.song);
    return;
  }
  const cursor = queueCursor();
  if (cursor === null || !nav.list.items.length) return;
  const store = useStore.getState();
  if (cursor === store.queueIndex) {
    setStatus("can't remove the playing track", true);
    return;
  }
  store.removeFromQueue(cursor);
}

export function moveSelected(delta: 1 | -1) {
  const cursor = queueCursor();
  if (cursor === null) return;
  const store = useStore.getState();
  const target = cursor + delta;
  if (target < 0 || target >= store.queue.length) return;
  // moveInQueue takes the position to insert before, in the list as it is before the move.
  store.moveInQueue(cursor, delta === 1 ? cursor + 2 : cursor - 1);
  setCursor('list', target);
}

export function clearQueueView() {
  if (rootView(useNav.getState()) !== 'queue') return;
  useStore.getState().clearQueue();
  setStatus('queue cleared');
}

/** `c`: creates a playlist in the playlists view, and clears the queue in the queue view. */
export function createOrClear() {
  if (rootView(useNav.getState()) === 'playlists') promptNewPlaylist();
  else clearQueueView();
}

// ── Playlists ────────────────────────────────────────────────────────────────
/** `P`: asks which playlist the selection should go in. */
export async function addSelectionToPlaylist() {
  const item = activePane()?.item;
  const config = useStore.getState().config;
  if (!item || !config || !holdsSongs(item)) return;

  const dialog: Dialog = {
    kind: 'pick',
    title: `add to playlist · ${itemName(item)}`,
    pane: { ...emptyPane, loading: true },
  };
  openDialog(dialog);

  const newRow: Item = { kind: 'action', label: 'new playlist…', run: () => promptNewPlaylist(item) };
  let pane: PaneState = { ...emptyPane, items: [newRow] };
  try {
    const rows = (await getPlaylists(config)).map((playlist): Item => ({
      kind: 'action',
      label: playlist.name,
      value: plural(playlist.songCount, 'track'),
      run: () => {
        closeDialog();
        void addToExisting(playlist, item);
      },
    }));
    pane = { ...pane, items: [newRow, ...rows] };
  } catch {
    pane = { ...pane, error: "couldn't load playlists" };
  }
  if (useNav.getState().dialog === dialog) useNav.setState({ dialog: { ...dialog, pane } });
}

async function addToExisting(playlist: Playlist, item: Item) {
  const config = useStore.getState().config;
  if (!config) return;
  setStatus(`adding to ${playlist.name}…`);
  try {
    const songs = await songsFor(config, item);
    if (!songs.length) {
      setStatus(`${itemName(item)} has no tracks`, true);
      return;
    }
    await addToPlaylist(config, playlist.id, songs.map(song => song.id));
    setStatus(`added ${plural(songs.length, 'track')} to ${playlist.name}`);
  } catch (e) {
    setStatus(`couldn't add to ${playlist.name}: ${errorText(e)}`, true);
  }
  // A long list goes in batches, so even a failure may have changed the playlist.
  await refreshPlaylist(playlist.id);
}

/** Asks for a name, then creates a playlist holding `item`'s songs, or an empty one. */
export function promptNewPlaylist(item?: Item) {
  openDialog({
    kind: 'prompt',
    title: item ? `new playlist · ${itemName(item)}` : 'new playlist',
    label: 'name',
    submitLabel: 'create',
    onSubmit: name => {
      closeDialog();
      void createWith(name, item);
    },
  });
}

async function createWith(name: string, item?: Item) {
  const config = useStore.getState().config;
  if (!config) return;
  setStatus(`creating ${name}…`);
  try {
    const songs = item ? await songsFor(config, item) : [];
    if (item && !songs.length) {
      setStatus(`${itemName(item)} has no tracks`, true);
      return;
    }
    const created = await createPlaylist(config, name, songs.map(song => song.id));
    await showCreatedPlaylist(created?.id);
    setStatus(item ? `created ${name} with ${plural(songs.length, 'track')}` : `created ${name}`);
  } catch (e) {
    setStatus(`couldn't create ${name}: ${errorText(e)}`, true);
    await showCreatedPlaylist(undefined);
  }
}

function confirmDeletePlaylist(playlist: Playlist) {
  openDialog({
    kind: 'confirm',
    title: 'delete playlist',
    message: `delete ${playlist.name} from the server? this can't be undone.`,
    confirmLabel: 'delete',
    onConfirm: () => {
      closeDialog();
      void deleteSelected(playlist);
    },
  });
}

async function deleteSelected(playlist: Playlist) {
  const config = useStore.getState().config;
  if (!config) return;
  try {
    await deletePlaylist(config, playlist.id);
    dropPlaylist(playlist.id);
    setStatus(`deleted ${playlist.name}`);
  } catch (e) {
    setStatus(`couldn't delete ${playlist.name}: ${errorText(e)}`, true);
  }
}

let removingTrack = false;

/**
 * Tracks are removed by position, and this list may have been loaded a while ago. So check the
 * position still holds this song first, or a playlist edited elsewhere would lose the wrong track.
 */
async function removeTrack(playlist: Playlist, index: number, song: Song) {
  const config = useStore.getState().config;
  if (!config || removingTrack) return;
  removingTrack = true;
  try {
    const current = await getPlaylist(config, playlist.id);
    if (current.entry?.[index]?.id === song.id) {
      await removeFromPlaylist(config, playlist.id, [index]);
      setStatus(`removed ${song.title} from ${playlist.name}`);
    } else {
      setStatus(`${playlist.name} changed on the server, so nothing was removed`, true);
    }
  } catch (e) {
    setStatus(`couldn't remove ${song.title}: ${errorText(e)}`, true);
  }
  await refreshPlaylist(playlist.id);
  removingTrack = false;
}

// ── Appearance ───────────────────────────────────────────────────────────────
export function cycleAccent() {
  const { accentColor, setAccentColor } = useStore.getState();
  const index = ACCENT_COLORS.findIndex(a => a.id === accentColor);
  const next = ACCENT_COLORS[(index + 1) % ACCENT_COLORS.length];
  crossfade(() => setAccentColor(next.id));
  setStatus(`accent: ${next.label.toLowerCase()}`);
}

