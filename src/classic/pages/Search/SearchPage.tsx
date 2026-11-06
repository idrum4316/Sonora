import { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { useStore } from '../../../core/store';
import { search3, getGenres } from '../../../core/subsonic';
import type { Album, Artist, Song, Genre } from '../../../core/subsonic';
import { AlbumCard } from '../../components/AlbumCard';
import { CoverArt, artClass } from '../../components/CoverArt';
import { fmt } from '../../../core/format';
import { addRecentSearch, loadRecentSearches, removeRecentSearch } from '../../../core/recentSearches';
import { Skeleton } from '../../components/ui';
import { genreGradient } from '../../utils/genreGradients';
import { TrackMoreButton, useTrackMenu } from '../../components/TrackMenu';

function initials(name: string): string {
  return name.split(/\s+/).slice(0, 2).map(w => w[0]?.toUpperCase() ?? '').join('');
}

/** Wrap search-term matches in <mark> — escaping HTML first */
function Highlight({ text, query }: { text: string; query: string }) {
  if (!query.trim()) return <>{text}</>;
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`(${escaped})`, 'gi');
  const parts = text.split(regex);
  return (
    <>
      {parts.map((part, i) =>
        regex.test(part) ? <mark key={i}>{part}</mark> : <span key={i}>{part}</span>
      )}
    </>
  );
}


// ── SearchPage ───────────────────────────────────────────────────────────────
export function SearchPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const config = useStore(s => s.config)!;
  const playOrToggle = useStore(s => s.playOrToggle);
  const currentTrack = useStore(s => s.currentTrack);

  const { openMenu, menuPortal } = useTrackMenu();

  const initialQuery = searchParams.get('q') ?? '';
  const [query, setQuery] = useState(initialQuery);
  const [artists, setArtists] = useState<Artist[]>([]);
  const [albums, setAlbums] = useState<Album[]>([]);
  const [songs, setSongs] = useState<Song[]>([]);
  const [genres, setGenres] = useState<Genre[]>([]);
  const [recentSearches, setRecentSearches] = useState<string[]>(loadRecentSearches);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(!!initialQuery);

  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  // Focus input on mount
  useEffect(() => { inputRef.current?.focus(); }, []);

  // Sync search param → query on popstate
  useEffect(() => {
    const q = searchParams.get('q') ?? '';
    if (q !== query) setQuery(q);
  }, [searchParams]);

  // Load genres for empty-state browse
  useEffect(() => {
    getGenres(config).then(setGenres).catch(console.error);
  }, [config]);

  // Search effect with debounce
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    const trimmed = query.trim();
    if (!trimmed) {
      setArtists([]);
      setAlbums([]);
      setSongs([]);
      setHasSearched(false);
      setSearchParams({}, { replace: true });
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      setSearchParams({ q: trimmed }, { replace: true });
      try {
        const result = await search3(config, trimmed, 6, 9, 8);
        setArtists(result.artist);
        setAlbums(result.album);
        setSongs(result.song);
        setHasSearched(true);
        addRecentSearch(trimmed);
        setRecentSearches(loadRecentSearches());
      } catch (e) {
        console.error('Search failed:', e);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query, config]);

  const handleRecentClick = useCallback((term: string) => {
    setQuery(term);
    inputRef.current?.focus();
  }, []);

  const handleRecentRemove = useCallback((term: string, e: React.MouseEvent) => {
    e.stopPropagation();
    removeRecentSearch(term);
    setRecentSearches(loadRecentSearches());
  }, []);

  const handleSongClick = useCallback((song: Song, idx: number) => {
    playOrToggle(song, songs, idx);
  }, [playOrToggle, songs]);

  const handlePlayAlbum = useStore(s => s.playAlbum);

  const topArtist = artists[0] ?? null;
  const hasResults = artists.length > 0 || albums.length > 0 || songs.length > 0;
  const showEmpty = hasSearched && !hasResults && !loading;

  return (
    <>
      {/* Page header */}
      <div className="search-page-header">
        <h1 className="search-page-title">
          {query.trim() ? `Results for "${query.trim()}"` : 'Search'}
        </h1>
      </div>

      {/* Loading skeleton */}
      {loading && (
        <div className="search-results">
          <SearchSkeleton />
        </div>
      )}

      {/* Results */}
      {!loading && hasResults && (
        <div className="search-results">

          {/* Top Result + Songs — side by side, each with its own label */}
          {(topArtist || songs.length > 0) && (
            <div className="top-result">

              {/* Left column: Top Result artist card */}
              {topArtist && (
                <div className="top-result-col">
                  <div className="results-section-label" aria-hidden="true">Top Result</div>
                  <a
                    href={`/artist/${topArtist.id}`}
                    className="top-result-card"
                    aria-label={`${topArtist.name} – Artist`}
                    onClick={e => { e.preventDefault(); navigate(`/artist/${topArtist.id}`); }}
                  >
                    <TopResultArt artist={topArtist} />
                    <div className="top-result-type">Artist</div>
                    <div className="top-result-name">
                      <Highlight text={topArtist.name} query={query} />
                    </div>
                    <div className="top-result-sub">
                      {topArtist.albumCount} {topArtist.albumCount === 1 ? 'album' : 'albums'} in your library
                    </div>
                    <div className="top-result-play" aria-hidden="true">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><polygon points="5,3 19,12 5,21" /></svg>
                    </div>
                  </a>
                </div>
              )}

              {/* Right column: Artists */}
              {artists.length > 0 && (
                <div className="top-result-col">
                  <div className="results-section-label" aria-hidden="true">Artists</div>
                  <div>
                    {artists.map(artist => (
                      <a
                        key={artist.id}
                        href={`/artist/${artist.id}`}
                        className="result-row"
                        aria-label={artist.name}
                        onClick={e => { e.preventDefault(); navigate(`/artist/${artist.id}`); }}
                      >
                        <ArtistAvatar artist={artist} />
                        <div className="result-info">
                          <div className="result-name">
                            <Highlight text={artist.name} query={query} />
                          </div>
                          <div className="result-sub">
                            Artist · {artist.albumCount} {artist.albumCount === 1 ? 'album' : 'albums'}
                          </div>
                        </div>
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Albums */}
          {albums.length > 0 && (
            <div className="results-section">
              <div className="results-section-label" aria-hidden="true">Albums</div>
              <div className="search-album-grid" role="list" aria-label="Album results">
                {albums.map(album => (
                  <AlbumCard
                    key={album.id}
                    album={album}
                    onClick={() => navigate(`/album/${album.id}`)}
                    onPlay={() => handlePlayAlbum(album)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Songs — at the bottom so a large list doesn't push Albums/Artists down */}
          {songs.length > 0 && (
            <div className="results-section">
              <div className="results-section-label" aria-hidden="true">Songs</div>
              <div className="top-result-tracks">
                {songs.map((song, i) => {
                  const isCurrent = currentTrack?.id === song.id;
                  return (
                    <div
                      key={song.id}
                      className={`tr-row${isCurrent ? ' playing' : ''}`}
                      role="row"
                      tabIndex={0}
                      aria-label={`${song.title} by ${song.artist}, ${fmt(song.duration)}`}
                      onClick={() => handleSongClick(song, i)}
                      onKeyDown={e => (e.key === 'Enter' || e.key === ' ') && handleSongClick(song, i)}
                      onContextMenu={e => openMenu(e, song)}
                    >
                      <div className={`tr-art ${artClass(song.albumId)}`}>
                        <CoverArt coverArt={song.coverArt} id={song.albumId} size={64} alt="" />
                      </div>
                      <div>
                        <div className="tr-title">
                          <Highlight text={song.title} query={query} />
                        </div>
                        <div className="tr-sub">{song.artist} · {song.album}</div>
                      </div>
                      <TrackMoreButton song={song} />
                      <div className="tr-dur">{fmt(song.duration)}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Empty state */}
      {showEmpty && (
        <div className="search-results">
          <div className="search-empty">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ color: 'var(--text-tertiary)' }}>
              <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <div className="search-empty-title">No results for "{query}"</div>
            <div className="search-empty-sub">Try a different search term or check your spelling.</div>
          </div>
        </div>
      )}

      {/* Browse state (no query) */}
      {!hasSearched && !loading && (
        <div className="search-results">
          {/* Recent searches */}
          {recentSearches.length > 0 && (
            <div className="results-section">
              <div className="results-section-label" aria-hidden="true">Recent Searches</div>
              <div className="recent-chips" role="list" aria-label="Recent searches">
                {recentSearches.map(term => (
                  <button
                    key={term}
                    className="recent-chip"
                    role="listitem"
                    onClick={() => handleRecentClick(term)}
                    aria-label={`Search for ${term}`}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                    </svg>
                    {term}
                    <span
                      className="recent-chip-remove"
                      role="button"
                      aria-label={`Remove ${term} from recent searches`}
                      onClick={e => handleRecentRemove(term, e)}
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                      </svg>
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Browse genres */}
          {genres.length > 0 && (
            <div className="results-section">
              <div className="results-section-label" aria-hidden="true">Browse All Genres</div>
              <div className="genre-grid" role="list" aria-label="Browse genres">
                {genres.slice(0, 12).map((genre, i) => (
                  <div
                    key={genre.value}
                    className="genre-card"
                    style={{ background: genreGradient(genre.value, i) }}
                    role="listitem"
                    tabIndex={0}
                    onClick={() => navigate(`/genre/${encodeURIComponent(genre.value)}`)}
                    onKeyDown={e => e.key === 'Enter' && navigate(`/genre/${encodeURIComponent(genre.value)}`)}
                    aria-label={`${genre.value} — ${genre.albumCount} albums`}
                  >
                    <div className="genre-card-label">{genre.value}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
      {menuPortal}
    </>
  );
}

// ── Sub-components ──────────────────────────────────────────────────────────

function TopResultArt({ artist }: { artist: Artist }) {
  const config = useStore(s => s.config);
  const [failed, setFailed] = useState(false);
  const cls = artClass(artist.id);
  const url = !failed
    ? artist.artistImageUrl || (config && artist.coverArt ? `${config.serverUrl.replace(/\/$/, '')}/rest/getCoverArt?id=${artist.coverArt}&size=240` : undefined)
    : undefined;

  return (
    <div className={`top-result-art ${cls}`} style={{ borderRadius: 'var(--radius-full)' }}>
      {url ? (
        <img
          src={url}
          alt=""
          style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 'inherit' }}
          loading="lazy"
          onError={() => setFailed(true)}
        />
      ) : (
        <div className="top-result-monogram" aria-hidden="true">
          {initials(artist.name)}
        </div>
      )}
    </div>
  );
}

function ArtistAvatar({ artist }: { artist: Artist }) {
  const config = useStore(s => s.config);
  const [failed, setFailed] = useState(false);
  const cls = artClass(artist.id);
  const url = !failed
    ? artist.artistImageUrl || (config && artist.coverArt ? `${config.serverUrl.replace(/\/$/, '')}/rest/getCoverArt?id=${artist.coverArt}&size=96` : undefined)
    : undefined;

  return (
    <div className={`result-art circle ${cls}`}>
      {url ? (
        <img
          src={url}
          alt=""
          style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 'inherit' }}
          loading="lazy"
          onError={() => setFailed(true)}
        />
      ) : (
        <div className="result-monogram" aria-hidden="true">
          {initials(artist.name)}
        </div>
      )}
    </div>
  );
}

function SearchSkeleton() {
  return (
    <>
      <div className="results-section">
        <Skeleton w="80px" h={11} style={{ marginBottom: 16 }} />
        <div className="top-result">
          <div>
            <Skeleton w={120} h={120} style={{ borderRadius: 'var(--radius-md)', marginBottom: 16 }} />
            <Skeleton w={60} h={9} style={{ marginBottom: 8 }} />
            <Skeleton w={180} h={24} style={{ marginBottom: 6 }} />
            <Skeleton w={140} h={12} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {Array.from({ length: 4 }, (_, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 8 }}>
                <Skeleton w={36} h={36} style={{ borderRadius: 'var(--radius-xs)', flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <Skeleton w="70%" h={13} style={{ marginBottom: 4 }} />
                  <Skeleton w="50%" h={11} />
                </div>
                <Skeleton w={32} h={11} />
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="results-section">
        <Skeleton w="60px" h={11} style={{ marginBottom: 16 }} />
        <div className="search-album-grid">
          {Array.from({ length: 3 }, (_, i) => (
            <div key={i}>
              <Skeleton w="100%" h={0} style={{ paddingBottom: '100%', borderRadius: 'var(--radius-md)' }} />
              <Skeleton w="75%" h={13} style={{ marginTop: 10 }} />
              <Skeleton w="55%" h={11} style={{ marginTop: 5 }} />
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
