// Sonora — Subsonic / Navidrome API client
// Uses token-based auth: t = MD5(password + salt), s = salt

export interface SubsonicConfig {
  serverUrl: string;
  username: string;
  password: string;
}

export interface Album {
  id: string;
  name: string;
  artist: string;
  artistId: string;
  coverArt?: string;
  songCount: number;
  duration: number;
  year?: number;
  genre?: string;
  created?: string;
  starred?: string;
}

export interface Artist {
  id: string;
  name: string;
  albumCount: number;
  artistImageUrl?: string;
  coverArt?: string;
  starred?: string;
}

export interface Song {
  id: string;
  title: string;
  artist: string;
  artistId: string;
  album: string;
  albumId: string;
  track?: number;
  year?: number;
  genre?: string;
  coverArt?: string;
  duration: number;
  bitRate?: number;
  suffix?: string;
  contentType?: string;
  starred?: string;
  userRating?: number;
}

export interface Playlist {
  id: string;
  name: string;
  comment?: string;
  songCount: number;
  duration: number;
  coverArt?: string;
  owner?: string;
}

export interface Genre {
  value: string;
  songCount: number;
  albumCount: number;
}

export interface PlaylistDetail extends Playlist {
  entry: Song[];
}

// ── Minimal MD5 implementation (Subsonic token auth) ─────────────────────────
function md5(input: string): string {
  function safeAdd(x: number, y: number): number {
    const lsw = (x & 0xffff) + (y & 0xffff);
    const msw = (x >> 16) + (y >> 16) + (lsw >> 16);
    return (msw << 16) | (lsw & 0xffff);
  }
  function rol(n: number, c: number): number { return (n << c) | (n >>> (32 - c)); }
  function cmn(q: number, a: number, b: number, x: number, s: number, t: number): number {
    return safeAdd(rol(safeAdd(safeAdd(a, q), safeAdd(x, t)), s), b);
  }
  function ff(a: number, b: number, c: number, d: number, x: number, s: number, t: number) { return cmn((b & c) | (~b & d), a, b, x, s, t); }
  function gg(a: number, b: number, c: number, d: number, x: number, s: number, t: number) { return cmn((b & d) | (c & ~d), a, b, x, s, t); }
  function hh(a: number, b: number, c: number, d: number, x: number, s: number, t: number) { return cmn(b ^ c ^ d, a, b, x, s, t); }
  function ii(a: number, b: number, c: number, d: number, x: number, s: number, t: number) { return cmn(c ^ (b | ~d), a, b, x, s, t); }

  const str = unescape(encodeURIComponent(input));
  const m: number[] = new Array(Math.ceil((str.length + 8 + 1) / 64) * 16).fill(0);
  for (let i = 0; i < str.length; i++) m[i >> 2] |= str.charCodeAt(i) << ((i % 4) * 8);
  m[str.length >> 2] |= 0x80 << ((str.length % 4) * 8);
  m[m.length - 2] = str.length * 8;

  let a = 1732584193, b = -271733879, c = -1732584194, d = 271733878;
  for (let i = 0; i < m.length; i += 16) {
    const oa = a, ob = b, oc = c, od = d;
    a = ff(a,b,c,d,m[i+0],7,-680876936);   d=ff(d,a,b,c,m[i+1],12,-389564586);
    c = ff(c,d,a,b,m[i+2],17,606105819);   b=ff(b,c,d,a,m[i+3],22,-1044525330);
    a = ff(a,b,c,d,m[i+4],7,-176418897);   d=ff(d,a,b,c,m[i+5],12,1200080426);
    c = ff(c,d,a,b,m[i+6],17,-1473231341); b=ff(b,c,d,a,m[i+7],22,-45705983);
    a = ff(a,b,c,d,m[i+8],7,1770035416);   d=ff(d,a,b,c,m[i+9],12,-1958414417);
    c = ff(c,d,a,b,m[i+10],17,-42063);     b=ff(b,c,d,a,m[i+11],22,-1990404162);
    a = ff(a,b,c,d,m[i+12],7,1804603682);  d=ff(d,a,b,c,m[i+13],12,-40341101);
    c = ff(c,d,a,b,m[i+14],17,-1502002290);b=ff(b,c,d,a,m[i+15],22,1236535329);
    a = gg(a,b,c,d,m[i+1],5,-165796510);   d=gg(d,a,b,c,m[i+6],9,-1069501632);
    c = gg(c,d,a,b,m[i+11],14,643717713);  b=gg(b,c,d,a,m[i+0],20,-373897302);
    a = gg(a,b,c,d,m[i+5],5,-701558691);   d=gg(d,a,b,c,m[i+10],9,38016083);
    c = gg(c,d,a,b,m[i+15],14,-660478335); b=gg(b,c,d,a,m[i+4],20,-405537848);
    a = gg(a,b,c,d,m[i+9],5,568446438);    d=gg(d,a,b,c,m[i+14],9,-1019803690);
    c = gg(c,d,a,b,m[i+3],14,-187363961);  b=gg(b,c,d,a,m[i+8],20,1163531501);
    a = gg(a,b,c,d,m[i+13],5,-1444681467); d=gg(d,a,b,c,m[i+2],9,-51403784);
    c = gg(c,d,a,b,m[i+7],14,1735328473);  b=gg(b,c,d,a,m[i+12],20,-1926607734);
    a = hh(a,b,c,d,m[i+5],4,-378558);      d=hh(d,a,b,c,m[i+8],11,-2022574463);
    c = hh(c,d,a,b,m[i+11],16,1839030562); b=hh(b,c,d,a,m[i+14],23,-35309556);
    a = hh(a,b,c,d,m[i+1],4,-1530992060);  d=hh(d,a,b,c,m[i+4],11,1272893353);
    c = hh(c,d,a,b,m[i+7],16,-155497632);  b=hh(b,c,d,a,m[i+10],23,-1094730640);
    a = hh(a,b,c,d,m[i+13],4,681279174);   d=hh(d,a,b,c,m[i+0],11,-358537222);
    c = hh(c,d,a,b,m[i+3],16,-722521979);  b=hh(b,c,d,a,m[i+6],23,76029189);
    a = hh(a,b,c,d,m[i+9],4,-640364487);   d=hh(d,a,b,c,m[i+12],11,-421815835);
    c = hh(c,d,a,b,m[i+15],16,530742520);  b=hh(b,c,d,a,m[i+2],23,-995338651);
    a = ii(a,b,c,d,m[i+0],6,-198630844);   d=ii(d,a,b,c,m[i+7],10,1126891415);
    c = ii(c,d,a,b,m[i+14],15,-1416354905);b=ii(b,c,d,a,m[i+5],21,-57434055);
    a = ii(a,b,c,d,m[i+12],6,1700485571);  d=ii(d,a,b,c,m[i+3],10,-1894986606);
    c = ii(c,d,a,b,m[i+10],15,-1051523);   b=ii(b,c,d,a,m[i+1],21,-2054922799);
    a = ii(a,b,c,d,m[i+8],6,1873313359);   d=ii(d,a,b,c,m[i+15],10,-30611744);
    c = ii(c,d,a,b,m[i+6],15,-1560198380); b=ii(b,c,d,a,m[i+13],21,1309151649);
    a = ii(a,b,c,d,m[i+4],6,-145523070);   d=ii(d,a,b,c,m[i+11],10,-1120210379);
    c = ii(c,d,a,b,m[i+2],15,718787259);   b=ii(b,c,d,a,m[i+9],21,-343485551);
    a = safeAdd(a, oa); b = safeAdd(b, ob); c = safeAdd(c, oc); d = safeAdd(d, od);
  }

  return [a, b, c, d].map(n =>
    Array.from({ length: 4 }, (_, i) => ((n >>> (i * 8)) & 0xff).toString(16).padStart(2, '0')).join('')
  ).join('');
}

// ── Auth helpers ──────────────────────────────────────────────────────────────
let cachedAuth: { key: string; params: Record<string, string> } | null = null;

function buildAuthParams(config: SubsonicConfig): Record<string, string> {
  const salt = Math.random().toString(36).substring(2, 10);
  const token = md5(config.password + salt);
  return { u: config.username, t: token, s: salt, v: '1.16.1', c: 'sonora', f: 'json' };
}

/** Return stable auth params for a given config (cached across calls). */
function getStableAuthParams(config: SubsonicConfig): Record<string, string> {
  const key = `${config.serverUrl}|${config.username}|${config.password}`;
  if (cachedAuth && cachedAuth.key === key) return cachedAuth.params;
  const params = buildAuthParams(config);
  cachedAuth = { key, params };
  return params;
}

function buildUrl(config: SubsonicConfig, endpoint: string, extra: Record<string, string | number> = {}, stable = false): string {
  const base = config.serverUrl.replace(/\/$/, '');
  const auth = stable ? getStableAuthParams(config) : buildAuthParams(config);
  const params = new URLSearchParams({ ...auth, ...Object.fromEntries(Object.entries(extra).map(([k, v]) => [k, String(v)])) });
  return `${base}/rest/${endpoint}?${params}`;
}

// ── API methods ───────────────────────────────────────────────────────────────
async function call<T>(config: SubsonicConfig, endpoint: string, params: Record<string, string | number> = {}): Promise<T> {
  const url = buildUrl(config, endpoint, params);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = await res.json();
  const sr = json['subsonic-response'];
  if (sr.status !== 'ok') throw new Error(sr.error?.message ?? 'Subsonic error');
  return sr as T;
}

export async function ping(config: SubsonicConfig): Promise<{ serverVersion?: string; type?: string }> {
  const sr = await call<{ serverVersion?: string; type?: string }>(config, 'ping');
  return sr;
}

export async function getAlbumList(
  config: SubsonicConfig,
  type: 'newest' | 'recent' | 'random' | 'starred' | 'frequent',
  size = 20,
  offset = 0
): Promise<Album[]> {
  const sr = await call<{ albumList2?: { album?: Album[] } }>(config, 'getAlbumList2', { type, size, offset });
  return sr.albumList2?.album ?? [];
}

export async function getAllAlbums(
  config: SubsonicConfig,
  type: 'newest' | 'recent' | 'random' | 'starred' | 'frequent',
): Promise<Album[]> {
  const pageSize = 500;
  const all: Album[] = [];
  let offset = 0;
  while (true) {
    const page = await getAlbumList(config, type, pageSize, offset);
    all.push(...page);
    if (page.length < pageSize) break;
    offset += pageSize;
  }
  return all;
}

export async function getPlaylists(config: SubsonicConfig): Promise<Playlist[]> {
  const sr = await call<{ playlists?: { playlist?: Playlist[] } }>(config, 'getPlaylists');
  return sr.playlists?.playlist ?? [];
}

export async function getPlaylist(config: SubsonicConfig, id: string): Promise<PlaylistDetail> {
  const sr = await call<{ playlist: PlaylistDetail }>(config, 'getPlaylist', { id });
  return sr.playlist;
}

export async function getAlbum(config: SubsonicConfig, id: string): Promise<Album & { song: Song[] }> {
  const sr = await call<{ album: Album & { song: Song[] } }>(config, 'getAlbum', { id });
  return sr.album;
}

export interface ArtistIndex {
  name: string;
  artist: Artist[];
}

export async function getArtists(config: SubsonicConfig): Promise<Artist[]> {
  const sr = await call<{ artists?: { index?: ArtistIndex[] } }>(config, 'getArtists');
  return (sr.artists?.index ?? []).flatMap(i => i.artist ?? []);
}

export async function getArtistsIndexed(config: SubsonicConfig): Promise<ArtistIndex[]> {
  const sr = await call<{ artists?: { index?: ArtistIndex[] } }>(config, 'getArtists');
  return sr.artists?.index ?? [];
}

export interface ArtistDetail extends Artist {
  album?: Album[];
}

export async function getArtist(config: SubsonicConfig, id: string): Promise<ArtistDetail> {
  const sr = await call<{ artist: ArtistDetail }>(config, 'getArtist', { id });
  return sr.artist;
}

export interface ArtistInfo {
  biography?: string;
  musicBrainzId?: string;
  lastFmUrl?: string;
  smallImageUrl?: string;
  mediumImageUrl?: string;
  largeImageUrl?: string;
  similarArtist?: { id: string; name: string; albumCount: number; artistImageUrl?: string; coverArt?: string }[];
}

export async function getArtistInfo(config: SubsonicConfig, id: string): Promise<ArtistInfo> {
  const sr = await call<{ artistInfo2?: ArtistInfo }>(config, 'getArtistInfo2', { id });
  return sr.artistInfo2 ?? {};
}

export async function getGenres(config: SubsonicConfig): Promise<Genre[]> {
  const sr = await call<{ genres?: { genre?: Genre[] } }>(config, 'getGenres');
  return (sr.genres?.genre ?? []).sort((a, b) => b.albumCount - a.albumCount);
}

export async function getSongsByGenre(
  config: SubsonicConfig,
  genre: string,
  count = 50,
  offset = 0,
): Promise<Song[]> {
  const sr = await call<{ songsByGenre?: { song?: Song[] } }>(config, 'getSongsByGenre', { genre, count, offset });
  return sr.songsByGenre?.song ?? [];
}

export async function getAlbumsByGenre(
  config: SubsonicConfig,
  genre: string,
  size = 50,
  offset = 0,
): Promise<Album[]> {
  const sr = await call<{ albumList2?: { album?: Album[] } }>(config, 'getAlbumList2', { type: 'byGenre', genre, size, offset });
  return sr.albumList2?.album ?? [];
}

export async function getStarred(config: SubsonicConfig): Promise<{ song: Song[]; album: Album[]; artist: Artist[] }> {
  const sr = await call<{ starred2?: { song?: Song[]; album?: Album[]; artist?: Artist[] } }>(config, 'getStarred2');
  return {
    song: sr.starred2?.song ?? [],
    album: sr.starred2?.album ?? [],
    artist: sr.starred2?.artist ?? [],
  };
}

export async function star(config: SubsonicConfig, id: string): Promise<void> {
  await call(config, 'star', { id });
}

export async function unstar(config: SubsonicConfig, id: string): Promise<void> {
  await call(config, 'unstar', { id });
}

export function getCoverArtUrl(config: SubsonicConfig, coverArt: string, size = 300): string {
  return buildUrl(config, 'getCoverArt', { id: coverArt, size }, true);
}

export function getStreamUrl(config: SubsonicConfig, songId: string): string {
  return buildUrl(config, 'stream', { id: songId });
}

export async function scrobble(config: SubsonicConfig, songId: string): Promise<void> {
  await call(config, 'scrobble', { id: songId });
}

export interface ScanStatus {
  scanning: boolean;
  count?: number;
}

export async function startScan(config: SubsonicConfig, fullScan = false): Promise<ScanStatus> {
  const params: Record<string, string | number> = {};
  if (fullScan) params.fullScan = 'true';
  const sr = await call<{ scanStatus?: ScanStatus }>(config, 'startScan', params);
  return sr.scanStatus ?? { scanning: false };
}

export async function getScanStatus(config: SubsonicConfig): Promise<ScanStatus> {
  const sr = await call<{ scanStatus?: ScanStatus }>(config, 'getScanStatus');
  return sr.scanStatus ?? { scanning: false };
}

export interface SearchResult {
  artist: Artist[];
  album: Album[];
  song: Song[];
}

export async function search3(
  config: SubsonicConfig,
  query: string,
  artistCount = 5,
  albumCount = 6,
  songCount = 10,
): Promise<SearchResult> {
  const sr = await call<{ searchResult3?: { artist?: Artist[]; album?: Album[]; song?: Song[] } }>(
    config, 'search3', { query, artistCount, albumCount, songCount },
  );
  return {
    artist: sr.searchResult3?.artist ?? [],
    album: sr.searchResult3?.album ?? [],
    song: sr.searchResult3?.song ?? [],
  };
}

// ── Playlist management ───────────────────────────────────────────────────────

/** Create a new playlist or overwrite an existing one. Pass songId array for initial tracks. */
export async function createPlaylist(
  config: SubsonicConfig,
  name: string,
  songIds: string[] = [],
): Promise<PlaylistDetail> {
  const url = buildUrl(config, 'createPlaylist');
  const params = new URLSearchParams();
  // Auth params are already in the url, add additional params
  params.append('name', name);
  for (const sid of songIds) params.append('songId', sid);

  const fullUrl = `${url}&${params}`;
  const res = await fetch(fullUrl);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = await res.json();
  const sr = json['subsonic-response'];
  if (sr.status !== 'ok') throw new Error(sr.error?.message ?? 'Subsonic error');
  return sr.playlist;
}

/** Add songs to an existing playlist by index. Uses updatePlaylist with songIdToAdd. */
export async function addToPlaylist(
  config: SubsonicConfig,
  playlistId: string,
  songIds: string[],
): Promise<void> {
  const url = buildUrl(config, 'updatePlaylist');
  const params = new URLSearchParams();
  params.append('playlistId', playlistId);
  for (const sid of songIds) params.append('songIdToAdd', sid);

  const fullUrl = `${url}&${params}`;
  const res = await fetch(fullUrl);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = await res.json();
  const sr = json['subsonic-response'];
  if (sr.status !== 'ok') throw new Error(sr.error?.message ?? 'Subsonic error');
}

/** Remove songs from a playlist by their indices (0-based). */
export async function removeFromPlaylist(
  config: SubsonicConfig,
  playlistId: string,
  songIndexes: number[],
): Promise<void> {
  const url = buildUrl(config, 'updatePlaylist');
  const params = new URLSearchParams();
  params.append('playlistId', playlistId);
  for (const idx of songIndexes) params.append('songIndexToRemove', String(idx));

  const fullUrl = `${url}&${params}`;
  const res = await fetch(fullUrl);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = await res.json();
  const sr = json['subsonic-response'];
  if (sr.status !== 'ok') throw new Error(sr.error?.message ?? 'Subsonic error');
}

/** Delete a playlist. */
export async function deletePlaylist(
  config: SubsonicConfig,
  id: string,
): Promise<void> {
  await call(config, 'deletePlaylist', { id });
}
