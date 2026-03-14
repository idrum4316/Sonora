import { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useVirtualizer } from '@tanstack/react-virtual';
import { useStore } from '../../store/useStore';
import {
  getAllAlbums, getArtistsIndexed, getPlaylists, getGenres, getStarred, getAlbum, getPlaylist,
  getCoverArtUrl,
} from '../../api/subsonic';
import type { Album, Artist, Playlist, Genre, Song, ArtistIndex } from '../../api/subsonic';
import { AlbumCard } from '../../components/AlbumCard';
import { ArtistCard } from '../../components/ArtistCard';
import { CoverArt, artClass } from '../../components/CoverArt';
import { TopbarNav, fmt, IconPlay, AlbumCardSkeleton } from '../../components/ui';
import { genreGradient } from '../../utils/genreGradients';

// ── Tab definitions ───────────────────────────────────────────────────────────
const TABS = ['albums', 'artists', 'playlists', 'genres', 'starred'] as const;
type Tab = typeof TABS[number];
const TAB_LABELS: Record<Tab, string> = {
  albums: 'Albums',
  artists: 'Artists',
  playlists: 'Playlists',
  genres: 'Genres',
  starred: 'Starred',
};

type ViewMode = 'grid' | 'list';
type AlbumSort = 'newest' | 'recent' | 'frequent' | 'random';
const ALBUM_SORT_LABELS: Record<AlbumSort, string> = {
  newest: 'Newest',
  recent: 'Recently Played',
  frequent: 'Most Played',
  random: 'Random',
};

// ── LibraryPage ───────────────────────────────────────────────────────────────
export function LibraryPage() {
  const config = useStore(s => s.config)!;
  const playTrack = useStore(s => s.playTrack);
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const activeTab = (searchParams.get('tab') as Tab) || 'albums';
  const setActiveTab = (tab: Tab) => setSearchParams({ tab }, { replace: true });

  // ── Albums state ──
  const [albums, setAlbums] = useState<Album[]>([]);
  const [albumSort, setAlbumSort] = useState<AlbumSort>('newest');
  const [albumsLoading, setAlbumsLoading] = useState(false);

  // ── Artists state ──
  const [artistIndices, setArtistIndices] = useState<ArtistIndex[]>([]);
  const [artistView, setArtistView] = useState<ViewMode>('list');
  const [artistSearch, setArtistSearch] = useState('');
  const [artistsLoading, setArtistsLoading] = useState(false);

  // ── Playlists state ──
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [playlistsLoading, setPlaylistsLoading] = useState(false);

  // ── Genres state ──
  const [genres, setGenres] = useState<Genre[]>([]);
  const [genresLoading, setGenresLoading] = useState(false);

  // ── Starred state ──
  const [starredSongs, setStarredSongs] = useState<Song[]>([]);
  const [starredAlbums, setStarredAlbums] = useState<Album[]>([]);
  const [starredLoading, setStarredLoading] = useState(false);

  // ── Stats (derived) ──
  const totalArtists = useMemo(() => artistIndices.reduce((n, idx) => n + idx.artist.length, 0), [artistIndices]);

  // ── Data loading (always fetch counts for all tabs) ──
  useEffect(() => {
    if (albums.length === 0) {
      setAlbumsLoading(true);
      getAllAlbums(config, albumSort)
        .then(setAlbums)
        .catch(console.error)
        .finally(() => setAlbumsLoading(false));
    }
    if (artistIndices.length === 0) {
      setArtistsLoading(true);
      getArtistsIndexed(config)
        .then(setArtistIndices)
        .catch(console.error)
        .finally(() => setArtistsLoading(false));
    }
    if (playlists.length === 0) {
      setPlaylistsLoading(true);
      getPlaylists(config)
        .then(setPlaylists)
        .catch(console.error)
        .finally(() => setPlaylistsLoading(false));
    }
    if (genres.length === 0) {
      setGenresLoading(true);
      getGenres(config)
        .then(setGenres)
        .catch(console.error)
        .finally(() => setGenresLoading(false));
    }
    if (starredSongs.length === 0 && starredAlbums.length === 0) {
      setStarredLoading(true);
      getStarred(config)
        .then(data => { setStarredSongs(data.song); setStarredAlbums(data.album); })
        .catch(console.error)
        .finally(() => setStarredLoading(false));
    }
  }, [config]); // eslint-disable-line react-hooks/exhaustive-deps

  // Re-fetch albums when sort changes
  useEffect(() => {
    setAlbumsLoading(true);
    getAllAlbums(config, albumSort)
      .then(setAlbums)
      .catch(console.error)
      .finally(() => setAlbumsLoading(false));
  }, [albumSort, config]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Artist filtering ──
  const artistQuery = artistSearch.toLowerCase().trim();
  const filteredArtists = useMemo(() => {
    if (!artistQuery) return artistIndices;
    return artistIndices
      .map(idx => ({ ...idx, artist: idx.artist.filter(a => a.name.toLowerCase().includes(artistQuery)) }))
      .filter(idx => idx.artist.length > 0);
  }, [artistIndices, artistQuery]);

  const filteredArtistCount = useMemo(
    () => filteredArtists.reduce((n, idx) => n + idx.artist.length, 0),
    [filteredArtists],
  );

  // ── Play handlers ──
  const playAlbum = useCallback(async (album: Album) => {
    try {
      const detail = await getAlbum(config, album.id);
      if (detail.song?.length) playTrack(detail.song[0], detail.song, 0);
    } catch (e) { console.error(e); }
  }, [config, playTrack]);

  const playPlaylist = useCallback(async (pl: Playlist) => {
    try {
      const detail = await getPlaylist(config, pl.id);
      if (detail.entry?.length) playTrack(detail.entry[0], detail.entry, 0);
    } catch (e) { console.error(e); }
  }, [config, playTrack]);

  const currentTrack = useStore(s => s.currentTrack);
  const isPlaying = useStore(s => s.isPlaying);

  return (
    <>
      {/* ── Topbar ── */}
      <div className="topbar">
        <TopbarNav onBack={() => navigate(-1)} onForward={() => navigate(1)} />
        <nav className="breadcrumb" aria-label="Breadcrumb">
          <Link to="/">Home</Link>
          <span className="breadcrumb-sep" aria-hidden="true">›</span>
          <span aria-current="page">Library</span>
        </nav>
        <div className="topbar-right" />
      </div>

      {/* ── Header + Tabs ── */}
      <div className="library-header">
        <h1 className="library-title">Your Library</h1>
        <div className="tab-bar" role="tablist" aria-label="Library sections">
          {TABS.map(tab => (
            <button
              key={tab}
              className={`tab${activeTab === tab ? ' active' : ''}`}
              role="tab"
              aria-selected={activeTab === tab}
              onClick={() => setActiveTab(tab)}
            >
              {TAB_LABELS[tab]}
            </button>
          ))}
        </div>
      </div>

      {/* ── Stats bar ── */}
      <div className="library-stats" role="status" aria-label="Library statistics">
        {totalArtists > 0 && (
          <div className="lib-stat"><strong>{totalArtists.toLocaleString()}</strong> Artists</div>
        )}
        {albums.length > 0 && (
          <div className="lib-stat"><strong>{albums.length.toLocaleString()}</strong> Albums</div>
        )}
        {starredSongs.length > 0 && (
          <div className="lib-stat"><strong>{starredSongs.length.toLocaleString()}</strong> Starred</div>
        )}
        {playlists.length > 0 && (
          <div className="lib-stat"><strong>{playlists.length.toLocaleString()}</strong> Playlists</div>
        )}
      </div>

      {/* ── Tab Content ── */}
      {activeTab === 'albums' && (
        <AlbumsTab
          albums={albums}
          loading={albumsLoading}
          sort={albumSort}
          onSortChange={setAlbumSort}
          onPlay={playAlbum}
          onNavigate={album => navigate(`/album/${album.id}`)}
        />
      )}

      {activeTab === 'artists' && (
        <ArtistsTab
          indices={filteredArtists}
          loading={artistsLoading}
          view={artistView}
          onViewChange={setArtistView}
          search={artistSearch}
          onSearchChange={setArtistSearch}
          totalCount={totalArtists}
          filteredCount={filteredArtistCount}
          isSearching={!!artistQuery}
        />
      )}

      {activeTab === 'playlists' && (
        <PlaylistsTab
          playlists={playlists}
          loading={playlistsLoading}
          onPlay={playPlaylist}
          onNavigate={pl => navigate(`/playlist/${pl.id}`)}
        />
      )}

      {activeTab === 'genres' && (
        <GenresTab genres={genres} loading={genresLoading} />
      )}

      {activeTab === 'starred' && (
        <StarredTab
          songs={starredSongs}
          albums={starredAlbums}
          loading={starredLoading}
          currentTrack={currentTrack}
          isPlaying={isPlaying}
          onPlaySong={(song, idx) => playTrack(song, starredSongs, idx)}
          onPlayAlbum={playAlbum}
          onNavigateAlbum={album => navigate(`/album/${album.id}`)}
        />
      )}
    </>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// ── Albums Tab ────────────────────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════
// ── Hook: compute column count from container width ──
function useGridColumns(containerRef: React.RefObject<HTMLElement | null>, minColWidth = 160, gap = 16) {
  const [columns, setColumns] = useState(5);
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const update = () => {
      const w = el.clientWidth;
      setColumns(Math.max(1, Math.floor((w + gap) / (minColWidth + gap))));
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [containerRef, minColWidth, gap]);
  return columns;
}

function AlbumsTab({
  albums, loading, sort, onSortChange, onPlay, onNavigate,
}: {
  albums: Album[];
  loading: boolean;
  sort: AlbumSort;
  onSortChange: (s: AlbumSort) => void;
  onPlay: (a: Album) => void;
  onNavigate: (a: Album) => void;
}) {
  const [showSortMenu, setShowSortMenu] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const gridContainerRef = useRef<HTMLDivElement>(null);
  const columns = useGridColumns(gridContainerRef);
  const rowCount = Math.ceil(albums.length / columns);

  // Estimate row height: album art aspect-ratio 1 + info padding (~50px) + grid gap (20px)
  const estimateSize = useCallback(() => 260, []);

  const virtualizer = useVirtualizer({
    count: rowCount,
    getScrollElement: () => scrollRef.current,
    estimateSize,
    overscan: 3,
  });

  // Find the scrollable parent (the .layout-main element)
  useEffect(() => {
    const el = gridContainerRef.current;
    if (!el) return;
    let parent = el.parentElement;
    while (parent) {
      const style = getComputedStyle(parent);
      if (style.overflowY === 'auto' || style.overflowY === 'scroll') {
        (scrollRef as React.MutableRefObject<HTMLElement | null>).current = parent as HTMLDivElement;
        virtualizer.measure();
        break;
      }
      parent = parent.parentElement;
    }
  }, [loading]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <>
      <div className="library-controls">
        <div className="sort-select-wrap">
          <button
            className="sort-select"
            aria-label={`Sort by ${ALBUM_SORT_LABELS[sort]}`}
            aria-expanded={showSortMenu}
            onClick={() => setShowSortMenu(v => !v)}
          >
            <IconSort />
            Sort: {ALBUM_SORT_LABELS[sort]}
            <IconChevronDown />
          </button>
          {showSortMenu && (
            <div className="sort-menu" role="listbox" aria-label="Sort options">
              {(Object.keys(ALBUM_SORT_LABELS) as AlbumSort[]).map(key => (
                <button
                  key={key}
                  className={`sort-menu-item${sort === key ? ' active' : ''}`}
                  role="option"
                  aria-selected={sort === key}
                  onClick={() => { onSortChange(key); setShowSortMenu(false); }}
                >
                  {ALBUM_SORT_LABELS[key]}
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="spacer" />
      </div>

      <div className="library-content" ref={gridContainerRef}>
        {loading ? (
          <div className="albums-grid" aria-hidden="true">
            {Array.from({ length: 18 }, (_, i) => <AlbumCardSkeleton key={i} />)}
          </div>
        ) : albums.length === 0 ? (
          <div className="library-empty" role="status">
            <p>No albums found.</p>
          </div>
        ) : (
          <div role="list" aria-label={`${albums.length} albums`}>
            <div
              style={{
                height: virtualizer.getTotalSize(),
                width: '100%',
                position: 'relative',
              }}
            >
              {virtualizer.getVirtualItems().map(virtualRow => {
                const startIdx = virtualRow.index * columns;
                const rowAlbums = albums.slice(startIdx, startIdx + columns);
                return (
                  <div
                    key={virtualRow.key}
                    className="albums-grid"
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      transform: `translateY(${virtualRow.start}px)`,
                    }}
                  >
                    {rowAlbums.map(album => (
                      <AlbumCard key={album.id} album={album} onPlay={onPlay} onClick={onNavigate} />
                    ))}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// ── Artists Tab ───────────────────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════
function ArtistsTab({
  indices, loading, view, onViewChange, search, onSearchChange,
  totalCount, filteredCount, isSearching,
}: {
  indices: ArtistIndex[];
  loading: boolean;
  view: ViewMode;
  onViewChange: (v: ViewMode) => void;
  search: string;
  onSearchChange: (s: string) => void;
  totalCount: number;
  filteredCount: number;
  isSearching: boolean;
}) {
  const navigate = useNavigate();
  const config = useStore(s => s.config);

  return (
    <>
      <div className="library-controls">
        <div className="artists-search-wrap">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="search"
            className="artists-search-input"
            placeholder="Search artists…"
            value={search}
            onChange={e => onSearchChange(e.target.value)}
            aria-label="Search artists"
          />
        </div>
        {!loading && (
          <span className="section-meta" style={{ marginLeft: 8 }}>
            {isSearching ? `${filteredCount} of ${totalCount}` : `${totalCount} artists`}
          </span>
        )}
        <div className="spacer" />
        <ViewToggle view={view} onChange={onViewChange} />
      </div>

      <div className="library-content">
        {loading ? (
          <ArtistsTabSkeleton view={view} />
        ) : indices.length === 0 ? (
          <div className="library-empty" role="status">
            {isSearching
              ? <p>No artists found for <strong>"{search}"</strong>.</p>
              : <p>No artists in your library yet.</p>
            }
          </div>
        ) : isSearching ? (
          <div className={view === 'grid' ? 'artist-grid' : undefined} role="list" aria-label={`${filteredCount} matching artists`}>
            {indices.flatMap(idx => idx.artist).map(artist =>
              view === 'grid' ? (
                <ArtistCard key={artist.id} artist={artist} />
              ) : (
                <ArtistListRow key={artist.id} artist={artist} config={config} onNavigate={() => navigate(`/artist/${artist.id}`)} />
              )
            )}
          </div>
        ) : (
          <>
            {/* Jump bar */}
            {indices.length > 1 && (
              <nav className="library-jump-nav" aria-label="Jump to letter">
                {indices.map(idx => (
                  <a key={idx.name} href={`#lib-letter-${encodeURIComponent(idx.name)}`} className="library-jump-link">
                    {idx.name}
                  </a>
                ))}
              </nav>
            )}

            {indices.map(idx => (
              <section
                key={idx.name}
                id={`lib-letter-${encodeURIComponent(idx.name)}`}
                className="letter-group"
                aria-labelledby={`lib-heading-${idx.name}`}
              >
                <div className="letter-heading" id={`lib-heading-${idx.name}`}>{idx.name}</div>
                {view === 'grid' ? (
                  <div className="artist-grid" role="list">
                    {idx.artist.map(artist => (
                      <ArtistCard key={artist.id} artist={artist} />
                    ))}
                  </div>
                ) : (
                  <div role="list">
                    {idx.artist.map(artist => (
                      <ArtistListRow key={artist.id} artist={artist} config={config} onNavigate={() => navigate(`/artist/${artist.id}`)} />
                    ))}
                  </div>
                )}
              </section>
            ))}
          </>
        )}
      </div>
    </>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// ── Playlists Tab ─────────────────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════
function PlaylistsTab({
  playlists, loading, onPlay, onNavigate,
}: {
  playlists: Playlist[];
  loading: boolean;
  onPlay: (pl: Playlist) => void;
  onNavigate: (pl: Playlist) => void;
}) {
  const config = useStore(s => s.config);

  return (
    <div className="library-content">
      {loading ? (
        <div className="library-playlist-grid" aria-hidden="true">
          {Array.from({ length: 8 }, (_, i) => <PlaylistCardSkeleton key={i} />)}
        </div>
      ) : playlists.length === 0 ? (
        <div className="library-empty" role="status">
          <p>No playlists yet.</p>
        </div>
      ) : (
        <div className="library-playlist-grid" role="list" aria-label={`${playlists.length} playlists`}>
          {playlists.map(pl => (
            <div
              key={pl.id}
              className="library-playlist-card"
              role="listitem"
              tabIndex={0}
              aria-label={`${pl.name}, ${pl.songCount} songs`}
              onClick={() => onNavigate(pl)}
              onKeyDown={e => e.key === 'Enter' && onNavigate(pl)}
            >
              <div className={`library-playlist-art ${artClass(pl.id)}`}>
                {pl.coverArt && config && (
                  <CoverArt coverArt={pl.coverArt} id={pl.id} size={300} alt="" />
                )}
                <div className="library-playlist-play">
                  <button
                    className="album-card-play-btn"
                    aria-label={`Play ${pl.name}`}
                    onClick={e => { e.stopPropagation(); onPlay(pl); }}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                      <polygon points="5,3 19,12 5,21" />
                    </svg>
                  </button>
                </div>
              </div>
              <div className="library-playlist-info">
                <div className="library-playlist-name">{pl.name}</div>
                <div className="library-playlist-meta">
                  {pl.songCount} {pl.songCount === 1 ? 'song' : 'songs'}
                  {pl.owner ? ` · ${pl.owner}` : ''}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// ── Genres Tab ────────────────────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════
function GenresTab({ genres, loading }: { genres: Genre[]; loading: boolean }) {
  const navigate = useNavigate();
  return (
    <div className="library-content">
      {loading ? (
        <div className="library-genre-grid" aria-hidden="true">
          {Array.from({ length: 12 }, (_, i) => (
            <div key={i} className="skeleton" style={{ aspectRatio: '2/1', borderRadius: 'var(--radius-md)' }} />
          ))}
        </div>
      ) : genres.length === 0 ? (
        <div className="library-empty" role="status">
          <p>No genres found.</p>
        </div>
      ) : (
        <div className="library-genre-grid" role="list" aria-label={`${genres.length} genres`}>
          {genres.map((g, i) => (
            <div
              key={g.value}
              className="library-genre-card"
              role="listitem"
              tabIndex={0}
              aria-label={`${g.value}: ${g.albumCount} albums, ${g.songCount} songs`}
              style={{ background: genreGradient(g.value, i) }}
              onClick={() => navigate(`/genre/${encodeURIComponent(g.value)}`)}
              onKeyDown={e => e.key === 'Enter' && navigate(`/genre/${encodeURIComponent(g.value)}`)}
            >
              <div className="library-genre-name">{g.value}</div>
              <div className="library-genre-meta">
                {g.albumCount} {g.albumCount === 1 ? 'album' : 'albums'} · {g.songCount} {g.songCount === 1 ? 'song' : 'songs'}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// ── Starred Tab ───────────────────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════
function StarredTab({
  songs, albums, loading, currentTrack, isPlaying, onPlaySong, onPlayAlbum, onNavigateAlbum,
}: {
  songs: Song[];
  albums: Album[];
  loading: boolean;
  currentTrack: Song | null;
  isPlaying: boolean;
  onPlaySong: (song: Song, idx: number) => void;
  onPlayAlbum: (album: Album) => void;
  onNavigateAlbum: (album: Album) => void;
}) {
  const navigate = useNavigate();

  return (
    <div className="library-content">
      {loading ? (
        <StarredSkeleton />
      ) : songs.length === 0 && albums.length === 0 ? (
        <div className="library-empty" role="status">
          <p>No starred items yet. Like songs and albums to see them here.</p>
        </div>
      ) : (
        <>
          {/* Starred albums */}
          {albums.length > 0 && (
            <section aria-labelledby="starred-albums-heading" style={{ marginBottom: 40 }}>
              <h2 className="library-section-title" id="starred-albums-heading">
                Starred Albums
                <span className="section-meta" style={{ marginLeft: 10 }}>{albums.length}</span>
              </h2>
              <div className="albums-grid" role="list" aria-label="Starred albums">
                {albums.map(album => (
                  <AlbumCard key={album.id} album={album} onPlay={onPlayAlbum} onClick={onNavigateAlbum} />
                ))}
              </div>
            </section>
          )}

          {/* Starred songs */}
          {songs.length > 0 && (
            <section aria-labelledby="starred-songs-heading">
              <h2 className="library-section-title" id="starred-songs-heading">
                Starred Songs
                <span className="section-meta" style={{ marginLeft: 10 }}>{songs.length}</span>
              </h2>
              <div className="library-song-list">
                <div className="pl-track-list-header">
                  <div className="track-list-header-label" style={{ textAlign: 'center' }}>#</div>
                  <div className="track-list-header-label">Title</div>
                  <div className="track-list-header-label">Album</div>
                  <div className="track-list-header-label right">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                      <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
                    </svg>
                  </div>
                </div>
                <div role="list">
                  {songs.map((song, idx) => {
                    const playing = currentTrack?.id === song.id;
                    return (
                      <div
                        key={song.id}
                        className={`pl-track-row${playing ? ' playing' : ''}`}
                        role="listitem"
                        tabIndex={0}
                        aria-label={`${song.title} by ${song.artist}`}
                        onClick={() => onPlaySong(song, idx)}
                        onKeyDown={e => e.key === 'Enter' && onPlaySong(song, idx)}
                      >
                        <div className="track-num">
                          {playing && isPlaying ? (
                            <div className="playing-bars"><span /><span /><span /></div>
                          ) : (
                            idx + 1
                          )}
                        </div>
                        <div className="track-play-icon" aria-hidden="true">
                          <IconPlay size={14} />
                        </div>
                        <div className="pl-track-main">
                          <div className="pl-track-info">
                            <div className="track-title">{song.title}</div>
                            <div className="track-artist">{song.artist}</div>
                          </div>
                        </div>
                        <div
                          className="pl-track-album"
                          onClick={e => { e.stopPropagation(); navigate(`/album/${song.albumId}`); }}
                        >
                          {song.album}
                        </div>
                        <div className="track-meta">
                          <span>{fmt(song.duration)}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// ── Shared sub-components ─────────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════

function ArtistListRow({ artist, config, onNavigate }: {
  artist: Artist;
  config: { serverUrl: string; username: string; password: string } | null;
  onNavigate: () => void;
}) {
  const [imgFailed, setImgFailed] = useState(false);
  const imageUrl = imgFailed
    ? undefined
    : artist.artistImageUrl ||
      (config && artist.coverArt ? getCoverArtUrl(config, artist.coverArt, 104) : undefined);

  return (
    <div
      className="artist-list-row"
      role="listitem"
      tabIndex={0}
      aria-label={`${artist.name}${artist.albumCount ? `, ${artist.albumCount} albums` : ''}`}
      onClick={onNavigate}
      onKeyDown={e => e.key === 'Enter' && onNavigate()}
    >
      <div className={`artist-list-img ${artClass(artist.id)}`}>
        {imageUrl && (
          <img
            src={imageUrl}
            alt=""
            style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center top' }}
            loading="lazy"
            onError={() => setImgFailed(true)}
          />
        )}
      </div>
      <div>
        <div className="artist-list-name">{artist.name}</div>
        {artist.albumCount != null && artist.albumCount > 0 && (
          <div className="artist-list-sub">
            {artist.albumCount} {artist.albumCount === 1 ? 'album' : 'albums'}
          </div>
        )}
      </div>
      <div className="artist-list-count">
        {artist.albumCount != null && artist.albumCount > 0
          ? `${artist.albumCount} ${artist.albumCount === 1 ? 'album' : 'albums'}`
          : ''}
      </div>
      <div className="artist-list-play" aria-hidden="true">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><polygon points="5,3 19,12 5,21" /></svg>
      </div>
    </div>
  );
}

function ViewToggle({ view, onChange }: { view: ViewMode; onChange: (v: ViewMode) => void }) {
  return (
    <div className="view-toggle" role="group" aria-label="View mode">
      <button
        className={`view-toggle-btn${view === 'grid' ? ' active' : ''}`}
        aria-label="Grid view"
        aria-pressed={view === 'grid'}
        onClick={() => onChange('grid')}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
        </svg>
      </button>
      <button
        className={`view-toggle-btn${view === 'list' ? ' active' : ''}`}
        aria-label="List view"
        aria-pressed={view === 'list'}
        onClick={() => onChange('list')}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/>
          <line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/>
        </svg>
      </button>
    </div>
  );
}

// ── Icons ─────────────────────────────────────────────────────────────────────
function IconSort() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="4" y1="6" x2="11" y2="6"/><line x1="4" y1="12" x2="17" y2="12"/><line x1="4" y1="18" x2="23" y2="18"/>
    </svg>
  );
}
function IconChevronDown() {
  return (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="6 9 12 15 18 9"/>
    </svg>
  );
}

// ── Skeletons ─────────────────────────────────────────────────────────────────
function ArtistsTabSkeleton({ view }: { view: ViewMode }) {
  if (view === 'grid') {
    return (
      <div aria-hidden="true">
        {Array.from({ length: 2 }, (_, s) => (
          <div key={s} style={{ marginBottom: 40 }}>
            <div className="skeleton" style={{ width: 28, height: 26, borderRadius: 6, marginBottom: 14 }} />
            <div className="artist-grid">
              {Array.from({ length: s === 0 ? 5 : 8 }, (_, i) => (
                <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div className="skeleton" style={{ aspectRatio: '1', borderRadius: 'var(--radius-md)' }} />
                  <div className="skeleton" style={{ height: 12, width: '70%', borderRadius: 4 }} />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }
  return (
    <div aria-hidden="true">
      {Array.from({ length: 2 }, (_, s) => (
        <div key={s} style={{ marginBottom: 32 }}>
          <div className="skeleton" style={{ width: 28, height: 32, borderRadius: 6, marginBottom: 16 }} />
          {Array.from({ length: s === 0 ? 3 : 5 }, (_, i) => (
            <div key={i} style={{ display: 'grid', gridTemplateColumns: '52px 1fr auto', gap: 14, padding: '8px', alignItems: 'center' }}>
              <div className="skeleton" style={{ width: 52, height: 52, borderRadius: 'var(--radius-full)' }} />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div className="skeleton" style={{ height: 14, width: '60%', borderRadius: 4 }} />
                <div className="skeleton" style={{ height: 11, width: '35%', borderRadius: 4 }} />
              </div>
              <div className="skeleton" style={{ height: 11, width: 60, borderRadius: 4 }} />
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

function PlaylistCardSkeleton() {
  return (
    <div>
      <div className="skeleton" style={{ width: '100%', aspectRatio: '1', borderRadius: 'var(--radius-md)' }} />
      <div style={{ padding: '10px 4px', display: 'flex', flexDirection: 'column', gap: 5 }}>
        <div className="skeleton" style={{ height: 13, width: '70%', borderRadius: 4 }} />
        <div className="skeleton" style={{ height: 11, width: '45%', borderRadius: 4 }} />
      </div>
    </div>
  );
}

function StarredSkeleton() {
  return (
    <div aria-hidden="true">
      <div className="skeleton" style={{ height: 22, width: 140, borderRadius: 6, marginBottom: 20 }} />
      <div className="albums-grid">
        {Array.from({ length: 4 }, (_, i) => <AlbumCardSkeleton key={i} />)}
      </div>
      <div className="skeleton" style={{ height: 22, width: 140, borderRadius: 6, margin: '40px 0 20px' }} />
      {Array.from({ length: 6 }, (_, i) => (
        <div key={i} className="pl-track-skeleton-row" style={{ padding: '6px 8px' }}>
          <div className="skeleton" style={{ width: 24, height: 14, borderRadius: 4 }} />
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5, flex: 1 }}>
              <div className="skeleton" style={{ height: 14, width: '55%', borderRadius: 4 }} />
              <div className="skeleton" style={{ height: 11, width: '35%', borderRadius: 4 }} />
            </div>
          </div>
          <div className="skeleton" style={{ height: 12, width: 80, borderRadius: 4 }} />
          <div className="skeleton" style={{ height: 12, width: 32, borderRadius: 4 }} />
        </div>
      ))}
    </div>
  );
}
