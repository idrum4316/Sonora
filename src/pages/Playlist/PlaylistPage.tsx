import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useStore } from '../../store/useStore';
import { getPlaylist, star, unstar, getCoverArtUrl } from '../../api/subsonic';
import type { PlaylistDetail, Song } from '../../api/subsonic';
import { CoverArt, artClass } from '../../components/CoverArt';
import { fmtDuration, Skeleton, TopbarNav, IconPlay, IconHeart, IconShuffle } from '../../components/ui';
import { TrackRow } from '../../components/TrackRow';

// ── PlaylistPage ───────────────────────────────────────────────────────────────
export function PlaylistPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const config = useStore(s => s.config)!;
  const playTrack = useStore(s => s.playTrack);
  const currentTrack = useStore(s => s.currentTrack);
  const isPlaying = useStore(s => s.isPlaying);
  const togglePlay = useStore(s => s.togglePlay);

  const [playlist, setPlaylist] = useState<PlaylistDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [liked, setLiked] = useState(false);
  const [starredSongs, setStarredSongs] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    setPlaylist(null);
    let cancelled = false;

    getPlaylist(config, id)
      .then(data => {
        if (cancelled) return;
        setPlaylist(data);
        const songs = data.entry ?? [];
        setStarredSongs(new Set(songs.filter(s => s.starred).map(s => s.id)));
      })
      .catch(console.error)
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [id, config]);

  const songs: Song[] = playlist?.entry ?? [];
  const coverClass = artClass(id ?? '');

  const playAll = useCallback((startIndex = 0) => {
    if (!songs.length) return;
    playTrack(songs[startIndex], songs, startIndex);
  }, [songs, playTrack]);

  const shuffleAll = useCallback(() => {
    if (!songs.length) return;
    const idx = Math.floor(Math.random() * songs.length);
    playTrack(songs[idx], songs, idx);
  }, [songs, playTrack]);

  const handleTrackClick = useCallback((song: Song, index: number) => {
    if (currentTrack?.id === song.id) {
      togglePlay();
    } else {
      playTrack(song, songs, index);
    }
  }, [currentTrack, togglePlay, playTrack, songs]);

  const toggleStar = useCallback(async (song: Song, e: React.MouseEvent) => {
    e.stopPropagation();
    const wasStarred = starredSongs.has(song.id);
    setStarredSongs(prev => {
      const next = new Set(prev);
      wasStarred ? next.delete(song.id) : next.add(song.id);
      return next;
    });
    try {
      wasStarred ? await unstar(config, song.id) : await star(config, song.id);
    } catch {
      setStarredSongs(prev => {
        const next = new Set(prev);
        wasStarred ? next.add(song.id) : next.delete(song.id);
        return next;
      });
    }
  }, [starredSongs, config]);

  const totalDuration = songs.reduce((acc, s) => acc + (s.duration ?? 0), 0);

  return (
    <>
      {/* ── Topbar ── */}
      <div className="topbar">
        <TopbarNav onBack={() => navigate(-1)} onForward={() => navigate(1)} />
        <nav className="breadcrumb" aria-label="Breadcrumb">
          <Link to="/">Home</Link>
          <span className="breadcrumb-sep" aria-hidden="true">›</span>
          <span aria-current="page">{loading ? '…' : (playlist?.name ?? 'Playlist')}</span>
        </nav>
        <div className="topbar-right" />
      </div>

      {/* ── Hero ── */}
      <div className="album-hero">
        {/* Blurred cover background */}
        {playlist?.coverArt && (
          <div
            aria-hidden="true"
            style={{
              position: 'absolute', inset: -40,
              backgroundImage: `url(${getCoverArtUrl(config, playlist.coverArt, 300)})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              filter: 'blur(80px) saturate(1.4)',
              opacity: 0.22,
              transform: 'scale(1.15)',
              pointerEvents: 'none',
            }}
          />
        )}
        {/* Gradient to bg */}
        <div
          aria-hidden="true"
          style={{
            position: 'absolute', inset: 0,
            background: 'linear-gradient(to bottom, transparent 0%, var(--bg) 100%)',
            pointerEvents: 'none',
          }}
        />

        <div className="album-hero-inner" style={{ animation: 'fadeUp 400ms ease both' }}>
          {/* Cover art */}
          <div className="album-cover-wrap">
            {loading ? (
              <div className="skeleton album-cover" />
            ) : (
              <div className={`album-cover ${coverClass}`}>
                <CoverArt
                  coverArt={playlist?.coverArt}
                  id={id ?? ''}
                  size={440}
                  alt={playlist ? `${playlist.name} cover art` : ''}
                />
              </div>
            )}
          </div>

          {/* Info */}
          <div className="album-info">
            <div className="album-type-badge">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" />
                <line x1="3" y1="6" x2="3.01" y2="6" /><line x1="3" y1="12" x2="3.01" y2="12" /><line x1="3" y1="18" x2="3.01" y2="18" />
              </svg>
              Playlist
            </div>

            {loading ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <Skeleton w={300} h={48} style={{ borderRadius: 10 }} />
                <Skeleton w={180} h={14} />
                <Skeleton w={220} h={12} />
                <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
                  <Skeleton w={90} h={38} style={{ borderRadius: 999 }} />
                  <Skeleton w={100} h={38} style={{ borderRadius: 999 }} />
                  <Skeleton w={80} h={38} style={{ borderRadius: 999 }} />
                </div>
              </div>
            ) : playlist ? (
              <>
                <h1 className="album-title">{playlist.name}</h1>
                <div className="album-meta-row">
                  {playlist.owner && (
                    <span className="album-meta-text" style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                      {playlist.owner}
                    </span>
                  )}
                  {playlist.songCount > 0 && (
                    <>
                      {playlist.owner && <div className="album-meta-dot" aria-hidden="true" />}
                      <span className="album-meta-text">
                        {playlist.songCount} {playlist.songCount === 1 ? 'track' : 'tracks'}
                      </span>
                    </>
                  )}
                  {totalDuration > 0 && (
                    <>
                      <div className="album-meta-dot" aria-hidden="true" />
                      <span className="album-meta-text">{fmtDuration(totalDuration)}</span>
                    </>
                  )}
                </div>
                {playlist.comment && (
                  <p className="pl-comment">{playlist.comment}</p>
                )}
                <div className="album-actions">
                  <button
                    className="btn btn-primary"
                    aria-label={`Play ${playlist.name}`}
                    onClick={() => playAll(0)}
                    disabled={!songs.length}
                  >
                    <IconPlay size={16} />
                    Play
                  </button>
                  <button
                    className="btn btn-secondary"
                    aria-label={`Shuffle ${playlist.name}`}
                    onClick={shuffleAll}
                    disabled={!songs.length}
                  >
                    <IconShuffle size={16} />
                    Shuffle
                  </button>
                  <button
                    className="btn btn-secondary"
                    aria-label={liked ? `Unlike ${playlist.name}` : `Like ${playlist.name}`}
                    aria-pressed={liked}
                    onClick={() => setLiked(v => !v)}
                    style={liked ? { color: 'var(--accent)', borderColor: 'var(--accent-dim)' } : undefined}
                  >
                    <IconHeart filled={liked} />
                    {liked ? 'Liked' : 'Like'}
                  </button>
                  <button className="btn btn-secondary btn-icon" aria-label="More options">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                      <circle cx="5" cy="12" r="1.5" /><circle cx="12" cy="12" r="1.5" /><circle cx="19" cy="12" r="1.5" />
                    </svg>
                  </button>
                </div>
              </>
            ) : null}
          </div>
        </div>
      </div>

      {/* ── Body ── */}
      <div className="album-body">
        {/* Track list */}
        <div className="album-tracks-col">
          {loading ? (
            <PlaylistTrackSkeleton />
          ) : songs.length > 0 ? (
            <>
              {/* Header */}
              <div className="pl-track-list-header" aria-hidden="true">
                <div className="track-list-header-label">#</div>
                <div className="track-list-header-label">Title</div>
                <div className="track-list-header-label">Album</div>
                <div className="track-list-header-label" style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
                  </svg>
                </div>
              </div>

              <ol className="track-list" aria-label={`Tracks in ${playlist?.name ?? 'playlist'}`}>
                {songs.map((song, i) => {
                  const isCurrentTrack = currentTrack?.id === song.id;
                  const isStarred = starredSongs.has(song.id);

                  return (
                    <TrackRow
                      key={`${song.id}-${i}`}
                      song={song}
                      index={i}
                      isCurrentTrack={isCurrentTrack}
                      isPlaying={isPlaying}
                      isStarred={isStarred}
                      trackNumber={i + 1}
                      showArt
                      showAlbum
                      alwaysShowArtist
                      onClick={() => handleTrackClick(song, i)}
                      onToggleStar={e => toggleStar(song, e)}
                      onAlbumClick={() => navigate(`/album/${song.albumId}`)}
                    />
                  );
                })}
              </ol>

              {/* Stats */}
              <div className="album-stats" aria-label="Playlist statistics">
                <div className="album-stat">
                  <div className="album-stat-val">{songs.length}</div>
                  <div className="album-stat-label">Tracks</div>
                </div>
                <div className="album-stat">
                  <div className="album-stat-val">{fmtDuration(totalDuration)}</div>
                  <div className="album-stat-label">Duration</div>
                </div>
                {playlist?.owner && (
                  <div className="album-stat">
                    <div className="album-stat-val" style={{ fontSize: 14 }}>{playlist.owner}</div>
                    <div className="album-stat-label">Owner</div>
                  </div>
                )}
              </div>
            </>
          ) : !loading ? (
            <EmptyPlaylist />
          ) : null}
        </div>

        {/* Sidebar */}
        <div>
          {loading ? (
            <SidebarSkeleton />
          ) : playlist ? (
            <div className="credits-panel">
              <div className="credits-title">About</div>
              {playlist.owner && (
                <div className="credit-row">
                  <div className="credit-role">Created by</div>
                  <div className="credit-name">{playlist.owner}</div>
                </div>
              )}
              <div className="credit-row">
                <div className="credit-role">Tracks</div>
                <div className="credit-name">{playlist.songCount}</div>
              </div>
              {totalDuration > 0 && (
                <div className="credit-row">
                  <div className="credit-role">Total time</div>
                  <div className="credit-name">{fmtDuration(totalDuration)}</div>
                </div>
              )}
              {playlist.comment && (
                <div className="credit-row">
                  <div className="credit-role">Note</div>
                  <div className="credit-name" style={{ color: 'var(--text-secondary)', fontSize: 13, lineHeight: 1.5 }}>
                    {playlist.comment}
                  </div>
                </div>
              )}
              {songs.length > 0 && (
                <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
                  <div className="credits-title" style={{ marginBottom: 10 }}>Quick Picks</div>
                  {songs.slice(0, 4).map((song, i) => (
                    <button
                      key={song.id}
                      className="pl-quick-pick"
                      aria-label={`Play ${song.title}`}
                      onClick={() => playAll(i)}
                    >
                      <div className={`pl-quick-art ${artClass(song.albumId)}`}>
                        <CoverArt coverArt={song.coverArt} id={song.albumId} size={56} alt="" />
                      </div>
                      <div className="pl-quick-info">
                        <div className="pl-quick-title">{song.title}</div>
                        <div className="pl-quick-artist">{song.artist}</div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : null}
        </div>
      </div>
    </>
  );
}

// ── Empty state ───────────────────────────────────────────────────────────────
function EmptyPlaylist() {
  return (
    <div className="pl-empty" role="status">
      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ color: 'var(--text-tertiary)', marginBottom: 16 }}>
        <line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" />
        <line x1="3" y1="6" x2="3.01" y2="6" /><line x1="3" y1="12" x2="3.01" y2="12" /><line x1="3" y1="18" x2="3.01" y2="18" />
      </svg>
      <p style={{ color: 'var(--text-secondary)', fontSize: 15, fontWeight: 500 }}>This playlist is empty</p>
      <p style={{ color: 'var(--text-tertiary)', fontSize: 13, marginTop: 6 }}>Add some tracks to get started.</p>
    </div>
  );
}

// ── Skeletons ─────────────────────────────────────────────────────────────────
function PlaylistTrackSkeleton() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {Array.from({ length: 12 }, (_, i) => (
        <div key={i} className="pl-track-skeleton-row">
          <Skeleton w={18} h={14} style={{ margin: 'auto' }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Skeleton w={38} h={38} style={{ borderRadius: 4, flexShrink: 0 }} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5, flex: 1 }}>
              <Skeleton w={`${45 + (i % 3) * 15}%`} h={13} />
              <Skeleton w={`${30 + (i % 4) * 10}%`} h={11} />
            </div>
          </div>
          <Skeleton w={`${40 + (i % 3) * 15}%`} h={13} />
          <Skeleton w={30} h={12} style={{ marginLeft: 'auto' }} />
        </div>
      ))}
    </div>
  );
}

function SidebarSkeleton() {
  return (
    <div className="credits-panel">
      <Skeleton w={50} h={10} style={{ marginBottom: 14 }} />
      {Array.from({ length: 3 }, (_, i) => (
        <div key={i} style={{ marginBottom: 12 }}>
          <Skeleton w={50} h={10} style={{ marginBottom: 4 }} />
          <Skeleton w={`${55 + i * 15}%`} h={13} />
        </div>
      ))}
    </div>
  );
}
