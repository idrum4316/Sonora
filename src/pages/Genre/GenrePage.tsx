import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useStore } from '../../store/useStore';
import {
  getGenres, getAlbumsByGenre, getSongsByGenre, getAlbum,
} from '../../api/subsonic';
import type { Album, Song, Genre } from '../../api/subsonic';
import { AlbumCard } from '../../components/AlbumCard';
import { CoverArt, artClass } from '../../components/CoverArt';
import { fmt, IconPlay, IconShuffle, AlbumCardSkeleton, Skeleton } from '../../components/ui';
import { genreGradient } from '../../utils/genreGradients';
import { TrackMoreButton, useTrackMenu } from '../../components/TrackMenu';

// ── GenrePage ─────────────────────────────────────────────────────────────────
export function GenrePage() {
  const { name } = useParams<{ name: string }>();
  const genreName = decodeURIComponent(name ?? '');
  const navigate = useNavigate();
  const config = useStore(s => s.config)!;
  const playTrack = useStore(s => s.playTrack);
  const currentTrack = useStore(s => s.currentTrack);
  const isPlaying = useStore(s => s.isPlaying);
  const togglePlay = useStore(s => s.togglePlay);

  const { openMenu, menuPortal } = useTrackMenu();

  const [genre, setGenre] = useState<Genre | null>(null);
  const [albums, setAlbums] = useState<Album[]>([]);
  const [songs, setSongs] = useState<Song[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!genreName) return;
    setLoading(true);
    setAlbums([]);
    setSongs([]);
    setGenre(null);
    let cancelled = false;

    async function load() {
      try {
        const [genresResult, albumsResult, songsResult] = await Promise.allSettled([
          getGenres(config),
          getAlbumsByGenre(config, genreName, 100),
          getSongsByGenre(config, genreName, 50),
        ]);
        if (cancelled) return;

        if (genresResult.status === 'fulfilled') {
          const found = genresResult.value.find(
            g => g.value.toLowerCase() === genreName.toLowerCase(),
          );
          if (found) setGenre(found);
        }
        if (albumsResult.status === 'fulfilled') setAlbums(albumsResult.value);
        if (songsResult.status === 'fulfilled') setSongs(songsResult.value);
      } catch (e) {
        console.error(e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [genreName, config]);

  const playAlbum = useCallback(async (album: Album) => {
    try {
      const detail = await getAlbum(config, album.id);
      if (detail.song?.length) playTrack(detail.song[0], detail.song, 0);
    } catch (e) { console.error(e); }
  }, [config, playTrack]);

  const handleSongClick = useCallback((song: Song, idx: number) => {
    if (currentTrack?.id === song.id) {
      togglePlay();
    } else {
      playTrack(song, songs, idx);
    }
  }, [currentTrack, togglePlay, playTrack, songs]);

  const shuffleSongs = useCallback(() => {
    if (!songs.length) return;
    const idx = Math.floor(Math.random() * songs.length);
    playTrack(songs[idx], songs, idx);
  }, [songs, playTrack]);

  const playAll = useCallback(() => {
    if (!songs.length) return;
    playTrack(songs[0], songs, 0);
  }, [songs, playTrack]);

  // Find index for gradient
  const gradientIdx = genreName.split('').reduce((h, c) => (h * 31 + c.charCodeAt(0)) | 0, 0);
  const gradient = genreGradient(genreName, Math.abs(gradientIdx));

  return (
    <>
      {/* ── Hero ── */}
      <div className="genre-hero" style={{ background: gradient }}>
        <div className="genre-hero-overlay" aria-hidden="true" />
        <div className="genre-hero-inner" style={{ animation: 'fadeUp 400ms ease both' }}>
          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <Skeleton w={280} h={52} style={{ borderRadius: 10 }} />
              <Skeleton w={180} h={16} />
              <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
                <Skeleton w={90} h={38} style={{ borderRadius: 999 }} />
                <Skeleton w={100} h={38} style={{ borderRadius: 999 }} />
              </div>
            </div>
          ) : (
            <>
              <div className="genre-hero-badge">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M9 18V5l12-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="18" cy="16" r="3" />
                </svg>
                Genre
              </div>
              <h1 className="genre-hero-title">{genreName}</h1>
              <div className="genre-hero-stats">
                {genre && (
                  <>
                    <span>{genre.albumCount.toLocaleString()} {genre.albumCount === 1 ? 'album' : 'albums'}</span>
                    <span className="genre-hero-dot" aria-hidden="true">·</span>
                    <span>{genre.songCount.toLocaleString()} {genre.songCount === 1 ? 'song' : 'songs'}</span>
                  </>
                )}
              </div>
              <div className="genre-hero-actions">
                <button
                  className="btn btn-primary"
                  aria-label={`Play all ${genreName} songs`}
                  onClick={playAll}
                  disabled={songs.length === 0}
                >
                  <IconPlay size={16} />
                  Play
                </button>
                <button
                  className="btn btn-secondary"
                  aria-label={`Shuffle ${genreName} songs`}
                  onClick={shuffleSongs}
                  disabled={songs.length === 0}
                >
                  <IconShuffle size={16} />
                  Shuffle
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── Body ── */}
      <div className="genre-body">
        {/* Albums section */}
        <section aria-labelledby="genre-albums-heading">
          <h2 className="genre-section-title" id="genre-albums-heading">
            Albums
            {!loading && albums.length > 0 && (
              <span className="section-meta" style={{ marginLeft: 10 }}>{albums.length}</span>
            )}
          </h2>
          {loading ? (
            <div className="albums-grid" aria-hidden="true">
              {Array.from({ length: 12 }, (_, i) => <AlbumCardSkeleton key={i} />)}
            </div>
          ) : albums.length === 0 ? (
            <div className="genre-empty" role="status">
              <p>No albums found in this genre.</p>
            </div>
          ) : (
            <div className="albums-grid" role="list" aria-label={`${albums.length} ${genreName} albums`}>
              {albums.map(album => (
                <AlbumCard
                  key={album.id}
                  album={album}
                  onPlay={playAlbum}
                  onClick={a => navigate(`/album/${a.id}`)}
                />
              ))}
            </div>
          )}
        </section>

        {/* Songs section */}
        <section aria-labelledby="genre-songs-heading" style={{ marginTop: 48 }}>
          <h2 className="genre-section-title" id="genre-songs-heading">
            Songs
            {!loading && songs.length > 0 && (
              <span className="section-meta" style={{ marginLeft: 10 }}>{songs.length}</span>
            )}
          </h2>
          {loading ? (
            <GenreSongsSkeleton />
          ) : songs.length === 0 ? (
            <div className="genre-empty" role="status">
              <p>No songs found in this genre.</p>
            </div>
          ) : (
            <div className="genre-song-list">
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
                      aria-label={`${song.title} by ${song.artist}, ${fmt(song.duration)}`}
                      onClick={() => handleSongClick(song, idx)}
                      onKeyDown={e => (e.key === 'Enter' || e.key === ' ') && handleSongClick(song, idx)}
                      onContextMenu={e => openMenu(e, song)}
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
                        <div className={`pl-track-art ${artClass(song.albumId)}`}>
                          <CoverArt coverArt={song.coverArt} id={song.albumId} size={80} alt="" />
                        </div>
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
                        <TrackMoreButton song={song} />
                        <span>{fmt(song.duration)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </section>
      </div>
      {menuPortal}
    </>
  );
}

// ── Skeleton for songs table ──────────────────────────────────────────────────
function GenreSongsSkeleton() {
  return (
    <div aria-hidden="true">
      {Array.from({ length: 8 }, (_, i) => (
        <div key={i} style={{ display: 'grid', gridTemplateColumns: '32px 1fr auto auto', gap: 12, padding: '8px 0', alignItems: 'center' }}>
          <div className="skeleton" style={{ width: 24, height: 14, borderRadius: 4 }} />
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <div className="skeleton" style={{ width: 40, height: 40, borderRadius: 'var(--radius-sm)', flexShrink: 0 }} />
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
