import { fmtDuration, plural } from '../core/format';
import { groupByDisc, releaseType } from '../core/library';
import { ACCENT_COLORS, useStore } from '../core/store';
import {
  getAlbum, getArtist, getPlaylist, getSongsByGenre,
  type Album, type Artist, type ArtistDetail, type Genre, type Playlist, type ScanStatus, type Song, type SubsonicConfig,
} from '../core/subsonic';
import { crossfade } from './motion';

/** Anything a terminal list can show. Rows and key actions are driven by `kind`. */
export type Item =
  /** `release` replaces the artist column in lists that are all by one artist. */
  | { kind: 'album'; album: Album; release?: string }
  | { kind: 'artist'; artist: Artist }
  | { kind: 'playlist'; playlist: Playlist }
  | { kind: 'genre'; genre: Genre }
  /** `sameArtist` leaves out the artist column in lists that are all by the artist named above them. */
  | { kind: 'song'; song: Song; disc?: number; sameArtist?: boolean }
  /** `swatches` shows a row of colored dots beside the value. `danger` marks a row that can't be undone lightly. */
  | { kind: 'action'; label: string; value?: string; swatches?: { color: string; on: boolean }[]; danger?: boolean; run: () => void }
  | { kind: 'link'; label: string; value: string; run: () => void }
  | { kind: 'info'; label: string; value: string }
  | { kind: 'recent'; term: string };

export const songItem = (song: Song): Item => ({ kind: 'song', song });
export const albumItem = (album: Album): Item => ({ kind: 'album', album });
export const artistItem = (artist: Artist): Item => ({ kind: 'artist', artist });

/** An artist's albums, newest first. */
export function discography(artist: ArtistDetail): Item[] {
  return [...(artist.album ?? [])]
    .sort((a, b) => (b.year ?? 0) - (a.year ?? 0))
    .map(album => ({ kind: 'album', album, release: releaseType(album.songCount ?? 0).toLowerCase() }));
}

/** Identifies an item's children in the cache, or null if they aren't worth caching. */
export function childrenKey(item: Item): string | null {
  switch (item.kind) {
    case 'album': return `album:${item.album.id}`;
    case 'artist': return `artist:${item.artist.id}`;
    case 'playlist': return `playlist:${item.playlist.id}`;
    case 'genre': return `genre:${item.genre.value}`;
    default: return null;
  }
}

function songDetails(song: Song): Extract<Item, { kind: 'info' }>[] {
  const rows: [string, string | number | undefined][] = [
    ['artist', song.artist],
    ['album', song.album],
    ['year', song.year],
    ['genre', song.genre],
    ['length', fmtDuration(song.duration)],
    ['format', song.suffix],
    ['bitrate', song.bitRate ? `${song.bitRate} kbps` : undefined],
  ];
  return rows.flatMap(([label, value]) => value ? [{ kind: 'info' as const, label, value: String(value) }] : []);
}

/** Rows of the now playing view. Enter on the artist or album row opens it. */
export function nowPlayingItems(song: Song, open: { artist: () => void; album: () => void }): Item[] {
  return songDetails(song).map((row): Item => {
    if (row.label === 'artist') return { ...row, kind: 'link', run: open.artist };
    if (row.label === 'album') return { ...row, kind: 'link', run: open.album };
    return row;
  });
}

/** The items shown in the detail pane when `item` is selected. */
export async function loadChildren(config: SubsonicConfig, item: Item): Promise<Item[]> {
  switch (item.kind) {
    case 'album': {
      const album = await getAlbum(config, item.album.id);
      const discs = groupByDisc(album.song ?? []);
      const sameArtist = (album.song ?? []).every(song => song.artist === album.artist);
      return discs.flatMap(disc => disc.tracks.map(({ song }) => ({
        kind: 'song' as const,
        song,
        disc: discs.length > 1 ? disc.number : undefined,
        sameArtist,
      })));
    }
    case 'artist':
      return discography(await getArtist(config, item.artist.id));
    case 'playlist': {
      const playlist = await getPlaylist(config, item.playlist.id);
      return (playlist.entry ?? []).map(songItem);
    }
    case 'genre':
      return (await getSongsByGenre(config, item.genre.value, 100)).map(songItem);
    case 'song':
      return songDetails(item.song);
    default:
      return [];
  }
}

// ── Summaries ────────────────────────────────────────────────────────────────
function joinSummary(parts: (string | number | false | undefined)[]): string | undefined {
  return parts.filter(Boolean).join(' · ') || undefined;
}

function totalLength(songs: Song[]): string {
  return fmtDuration(Math.floor(songs.reduce((total, song) => total + (song.duration ?? 0), 0)));
}

function albumSummary(album: Album, tracks: Item[]): string | undefined {
  const songs = songsIn(tracks);
  const discs = groupByDisc(songs).length;
  const sample = songs.find(song => song.suffix || song.bitRate);
  return joinSummary([
    album.genre ?? songs[0]?.genre,
    songs.length > 0 && plural(songs.length, 'track'),
    discs > 1 && plural(discs, 'disc'),
    songs.length > 0 && totalLength(songs),
    sample?.suffix,
    !!sample?.bitRate && `${sample.bitRate} kbps`,
  ]);
}

/** What the albums in `items` add up to, for an artist. */
export function artistSummary(items: Item[]): string | undefined {
  const albums = items.flatMap(item => item.kind === 'album' ? [item.album] : []);
  if (!albums.length) return undefined;
  const years = albums.flatMap(album => album.year ? [album.year] : []);
  const first = Math.min(...years);
  const last = Math.max(...years);
  const tracks = albums.reduce((total, album) => total + (album.songCount ?? 0), 0);
  return joinSummary([
    years.length > 0 && (first === last ? first : `${first} – ${last}`),
    plural(albums.length, 'album'),
    tracks > 0 && plural(tracks, 'track'),
  ]);
}

/** How many tracks are left after the current one, and how long they'll take. */
export function upNextSummary(queue: Song[], queueIndex: number): string | undefined {
  const upNext = queue.slice(queueIndex + 1);
  return upNext.length ? `${plural(upNext.length, 'track')} · ${totalLength(upNext)}` : undefined;
}

/** The line above `item`'s children in the detail pane. */
export function detailSummary(item: Item, children: Item[]): string | undefined {
  switch (item.kind) {
    case 'album': return albumSummary(item.album, children);
    case 'artist': return artistSummary(children);
    case 'playlist': return joinSummary([!!item.playlist.owner && `by ${item.playlist.owner}`, item.playlist.comment]);
    default: return undefined;
  }
}

/** What the detail pane calls its contents when `item` is selected. */
export function detailLabel(item: Item): string {
  switch (item.kind) {
    case 'artist': return 'albums';
    case 'album':
    case 'playlist':
    case 'genre': return 'tracks';
    default: return 'details';
  }
}

/** The large type at the top of the detail pane. There's no cover art here, so this is the cover. */
export function detailHeading(item: Item): { title: string; subtitle?: string } | null {
  switch (item.kind) {
    case 'album': return { title: item.album.name, subtitle: joinSummary([item.album.artist, item.album.year]) };
    case 'artist': return { title: item.artist.name };
    case 'playlist': return { title: item.playlist.name };
    case 'genre': return { title: item.genre.value, subtitle: `${plural(item.genre.albumCount, 'album')} · ${plural(item.genre.songCount, 'track')}` };
    case 'song': return { title: item.song.title, subtitle: item.song.artist };
    default: return null;
  }
}

/** Whether `item` stands for songs, so it can be queued or added to a playlist. */
export function holdsSongs(item: Item): boolean {
  return item.kind !== 'action' && item.kind !== 'link' && item.kind !== 'info' && item.kind !== 'recent';
}

export function songsIn(items: Item[]): Song[] {
  return items.flatMap(item => item.kind === 'song' ? [item.song] : []);
}

/** Every song that playing or queueing `item` would include. */
export async function songsFor(config: SubsonicConfig, item: Item): Promise<Song[]> {
  if (item.kind === 'song') return [item.song];
  const children = await loadChildren(config, item);
  if (item.kind !== 'artist') return songsIn(children);
  const albums = await Promise.all(children.map(child => songsFor(config, child)));
  return albums.flat();
}

/** Returns the item with its star updated if it's the one with this id. */
export function withStarred(item: Item, id: string, starred: string | undefined): Item {
  if (item.kind === 'song' && item.song.id === id) return { ...item, song: { ...item.song, starred } };
  if (item.kind === 'album' && item.album.id === id) return { ...item, album: { ...item.album, starred } };
  if (item.kind === 'artist' && item.artist.id === id) return { ...item, artist: { ...item.artist, starred } };
  return item;
}

export function starTarget(item: Item): { id: string; starred: boolean } | null {
  if (item.kind === 'song') return { id: item.song.id, starred: !!item.song.starred };
  if (item.kind === 'album') return { id: item.album.id, starred: !!item.album.starred };
  if (item.kind === 'artist') return { id: item.artist.id, starred: !!item.artist.starred };
  return null;
}

export function itemName(item: Item): string {
  switch (item.kind) {
    case 'album': return item.album.name;
    case 'artist': return item.artist.name;
    case 'playlist': return item.playlist.name;
    case 'genre': return item.genre.value;
    case 'song': return item.song.title;
    case 'action':
    case 'link':
    case 'info': return item.label;
    case 'recent': return item.term;
  }
}

interface SettingsContext {
  /** Reports a message on the status line. */
  notify: (text: string) => void;
  /** The server's type and version, or null until they've loaded. */
  server: string | null;
  /** The scan state, or null if it isn't known. */
  scan: ScanStatus | null;
  startScan: (fullScan: boolean) => void;
}

function scanText(server: string | null, scan: ScanStatus | null): string {
  if (!scan) return server === null ? '…' : 'unknown';
  if (!scan.scanning) return 'idle';
  return scan.count != null ? `scanning · ${scan.count.toLocaleString()} items` : 'scanning…';
}

// Rows are rebuilt on every refresh, so this has to outlive them.
let disconnectArmed = false;

/** Rows of the settings view. Keep the row count fixed, or a refresh moves the cursor to another row. */
export function settingsItems({ notify, server, scan, startScan }: SettingsContext): Item[] {
  const s = useStore.getState();
  const accentIndex = ACCENT_COLORS.findIndex(a => a.id === s.accentColor);
  return [
    { kind: 'action', label: 'theme', value: s.theme, run: () => crossfade(() => useStore.getState().toggleTheme()) },
    {
      kind: 'action',
      label: 'accent',
      value: ACCENT_COLORS[accentIndex]?.label.toLowerCase() ?? s.accentColor,
      swatches: ACCENT_COLORS.map((accent, index) => ({ color: accent.swatch, on: index === accentIndex })),
      run: () => crossfade(() => useStore.getState().setAccentColor(ACCENT_COLORS[(accentIndex + 1) % ACCENT_COLORS.length].id)),
    },
    {
      kind: 'action',
      label: 'scrobble after',
      value: `${s.scrobbleThreshold}%`,
      run: () => useStore.getState().setScrobbleThreshold(s.scrobbleThreshold >= 100 ? 10 : s.scrobbleThreshold + 5),
    },
    { kind: 'action', label: 'quick scan', run: () => startScan(false) },
    { kind: 'action', label: 'full scan', run: () => startScan(true) },
    { kind: 'info', label: 'scan', value: scanText(server, scan) },
    { kind: 'info', label: 'server', value: s.config?.serverUrl ?? '' },
    { kind: 'info', label: 'user', value: s.config?.username ?? '' },
    { kind: 'info', label: 'software', value: server ?? '…' },
    { kind: 'action', label: 'switch to classic ui', run: () => window.location.assign('/') },
    {
      kind: 'action',
      label: 'disconnect',
      danger: true,
      run: () => {
        if (disconnectArmed) {
          disconnectArmed = false;
          useStore.getState().clearConfig();
          return;
        }
        disconnectArmed = true;
        notify('press enter again to disconnect');
        setTimeout(() => { disconnectArmed = false; }, 3000);
      },
    },
  ];
}
