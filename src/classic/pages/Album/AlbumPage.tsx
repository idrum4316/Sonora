import { useEffect, useState, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useStore } from '../../../core/store';
import { getAlbum, getArtist, star, unstar, getCoverArtUrl } from '../../../core/subsonic';
import type { Album, Song } from '../../../core/subsonic';
import { CoverArt, artClass } from '../../components/CoverArt';
import { ImageLightbox } from '../../components/ImageLightbox';
import { fmtDuration } from '../../../core/format';
import { groupByDisc } from '../../../core/library';
import { Skeleton, IconPlay, IconHeart, IconShuffle, IconPlayNext, IconAddQueue, IconExpand } from '../../components/ui';
import { TrackRow } from '../../components/TrackRow';
import { useTrackMenu } from '../../components/TrackMenu';
import { AddToPlaylistDialog } from '../../components/AddToPlaylistDialog';

// ── AlbumPage ─────────────────────────────────────────────────────────────────
export function AlbumPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const config = useStore(s => s.config)!;
  const playTrack = useStore(s => s.playTrack);
  const playOrToggle = useStore(s => s.playOrToggle);
  const playMultipleNext = useStore(s => s.playMultipleNext);
  const addMultipleToQueue = useStore(s => s.addMultipleToQueue);
  const currentTrack = useStore(s => s.currentTrack);
  const isPlaying = useStore(s => s.isPlaying);

  const { openMenu, menuPortal } = useTrackMenu();

  const [showPlaylistDialog, setShowPlaylistDialog] = useState(false);
  const [album, setAlbum] = useState<(Album & { song: Song[] }) | null>(null);
  const [relatedAlbums, setRelatedAlbums] = useState<Album[]>([]);
  const [loading, setLoading] = useState(true);
  const [starredSongs, setStarredSongs] = useState<Set<string>>(new Set());
  const [albumLiked, setAlbumLiked] = useState(false);
  const [lightbox, setLightbox] = useState<{ src: string; alt: string } | null>(null);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    setAlbum(null);
    setRelatedAlbums([]);
    let cancelled = false;

    async function load() {
      try {
        const detail = await getAlbum(config, id!);
        if (cancelled) return;
        setAlbum(detail);
        setAlbumLiked(!!detail.starred);
        setStarredSongs(new Set(detail.song?.filter(s => s.starred).map(s => s.id) ?? []));

        if (detail.artistId) {
          try {
            const artistDetail = await getArtist(config, detail.artistId);
            if (!cancelled) {
              setRelatedAlbums((artistDetail.album ?? []).filter(a => a.id !== id).slice(0, 5));
            }
          } catch { /* not critical */ }
        }
      } catch (e) {
        console.error(e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [id, config]);

  const playAlbum = useCallback((startIndex = 0) => {
    if (!album?.song?.length) return;
    playTrack(album.song[startIndex], album.song, startIndex);
  }, [album, playTrack]);

  const handleTrackClick = useCallback((song: Song, index: number) => {
    playOrToggle(song, album?.song ?? [], index);
  }, [playOrToggle, album]);

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

  const shuffleAlbum = useCallback(() => {
    if (!album?.song?.length) return;
    const idx = Math.floor(Math.random() * album.song.length);
    playTrack(album.song[idx], album.song, idx);
  }, [album, playTrack]);

  const toggleAlbumLike = useCallback(async () => {
    if (!album) return;
    const wasLiked = albumLiked;
    setAlbumLiked(!wasLiked);
    try {
      wasLiked ? await unstar(config, album.id) : await star(config, album.id);
    } catch {
      setAlbumLiked(wasLiked);
    }
  }, [album, albumLiked, config]);

  const discs = useMemo(() => groupByDisc(album?.song ?? []), [album]);
  const isMultiDisc = discs.length > 1;

  // ── Blurred hero background color from art class ──────────────────────────
  const coverClass = album ? artClass(album.id) : 'art-violet';

  return (
    <>
      {/* ── Hero ── */}
      <div className="album-hero">
        {/* Blurred art background */}
        {album?.coverArt && (
          <div
            aria-hidden="true"
            style={{
              position: 'absolute', inset: -40,
              backgroundImage: `url(${getCoverArtUrl(config, album.coverArt, 300)})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              filter: 'blur(80px) saturate(1.4)',
              opacity: 0.22,
              transform: 'scale(1.15)',
              pointerEvents: 'none',
            }}
          />
        )}
        {/* Gradient overlay */}
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
              <div
                className={`album-cover expandable-image ${coverClass}${album?.coverArt ? '' : ' expandable-image--disabled'}`}
                role={album?.coverArt ? 'button' : undefined}
                tabIndex={album?.coverArt ? 0 : -1}
                aria-label={album?.coverArt ? `View larger image of ${album.name} cover art` : undefined}
                onClick={() => {
                  if (album?.coverArt) {
                    setLightbox({
                      src: getCoverArtUrl(config, album.coverArt, 1200),
                      alt: `${album.name} cover art`,
                    });
                  }
                }}
                onKeyDown={e => {
                  if (album?.coverArt && (e.key === 'Enter' || e.key === ' ')) {
                    e.preventDefault();
                    setLightbox({
                      src: getCoverArtUrl(config, album.coverArt, 1200),
                      alt: `${album.name} cover art`,
                    });
                  }
                }}
              >
                <CoverArt
                  coverArt={album?.coverArt}
                  id={album?.id ?? ''}
                  size={440}
                  alt=""
                />
                {album?.coverArt && (
                  <button
                    className="expandable-image-expand"
                    onClick={e => {
                      e.stopPropagation();
                      setLightbox({
                        src: getCoverArtUrl(config, album.coverArt!, 1200),
                        alt: `${album.name} cover art`,
                      });
                    }}
                    aria-label={`View larger image of ${album.name} cover art`}
                    tabIndex={-1}
                  >
                    <IconExpand size={14} />
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Info */}
          <div className="album-info">
            <div className="album-type-badge">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="3" fill="var(--bg)" />
              </svg>
              Album
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
            ) : album ? (
              <>
                <h1 className="album-title">{album.name}</h1>
                <div className="album-meta-row">
                  <span
                    className="album-artist-link"
                    role="link"
                    tabIndex={0}
                    aria-label={`View artist ${album.artist}`}
                    onKeyDown={e => e.key === 'Enter' && navigate(`/artist/${album.artistId}`)}
                    onClick={() => navigate(`/artist/${album.artistId}`)}
                  >
                    {album.artist}
                  </span>
                  {album.year && (
                    <>
                      <div className="album-meta-dot" aria-hidden="true" />
                      <span className="album-meta-text">{album.year}</span>
                    </>
                  )}
                  {album.genre && (
                    <>
                      <div className="album-meta-dot" aria-hidden="true" />
                      <span
                        className="album-meta-text album-genre-link"
                        role="link"
                        tabIndex={0}
                        onClick={() => navigate(`/genre/${encodeURIComponent(album.genre!)}`)}
                        onKeyDown={e => e.key === 'Enter' && navigate(`/genre/${encodeURIComponent(album.genre!)}`)}
                      >
                        {album.genre}
                      </span>
                    </>
                  )}
                  {album.songCount > 0 && (
                    <>
                      <div className="album-meta-dot" aria-hidden="true" />
                      <span className="album-meta-text">
                        {album.songCount} {album.songCount === 1 ? 'track' : 'tracks'}
                        {isMultiDisc && <> · {discs.length} discs</>},{' '}
                        {fmtDuration(album.duration)}
                      </span>
                    </>
                  )}
                </div>
                <div className="album-actions">
                  <button
                    className="btn btn-primary"
                    aria-label={`Play ${album.name}`}
                    onClick={() => playAlbum(0)}
                  >
                    <IconPlay size={16} />
                    Play
                  </button>
                  <button
                    className="btn btn-secondary"
                    aria-label={`Shuffle ${album.name}`}
                    onClick={shuffleAlbum}
                  >
                    <IconShuffle size={16} />
                    Shuffle
                  </button>
                  <button
                    className={`btn btn-secondary${albumLiked ? ' btn-liked' : ''}`}
                    aria-label={albumLiked ? `Unlike ${album.name}` : `Like ${album.name}`}
                    aria-pressed={albumLiked}
                    onClick={toggleAlbumLike}
                    style={albumLiked ? { color: 'var(--accent)', borderColor: 'var(--accent-dim)' } : undefined}
                  >
                    <IconHeart filled={albumLiked} />
                    {albumLiked ? 'Liked' : 'Like'}
                  </button>
                  <button
                    className="btn btn-secondary"
                    aria-label={`Play ${album.name} next`}
                    onClick={() => playMultipleNext(album.song ?? [])}
                  >
                    <IconPlayNext />
                    Play Next
                  </button>
                  <button
                    className="btn btn-secondary"
                    aria-label={`Add ${album.name} to queue`}
                    onClick={() => addMultipleToQueue(album.song ?? [])}
                  >
                    <IconAddQueue />
                    Add to Queue
                  </button>
                  <button
                    className="btn btn-secondary"
                    aria-label={`Add ${album.name} to playlist`}
                    onClick={() => setShowPlaylistDialog(true)}
                  >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" />
                      <line x1="3" y1="6" x2="3.01" y2="6" /><line x1="3" y1="12" x2="3.01" y2="12" />
                      <line x1="12" y1="18" x2="12" y2="24" /><line x1="9" y1="21" x2="15" y2="21" />
                    </svg>
                    Add to Playlist
                  </button>
                </div>
              </>
            ) : null}
          </div>
        </div>
      </div>

      {/* ── Body: tracks + sidebar ── */}
      <div className="album-body">
        {/* Track list column */}
        <div className="album-tracks-col">
          {loading ? (
            <TrackListSkeleton />
          ) : album?.song?.length ? (
            <>
              {/* Header */}
              <div className="track-list-header" aria-hidden="true">
                <div className="track-list-header-label">#</div>
                <div className="track-list-header-label">Title</div>
                <div className="track-list-header-label right" style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
                  </svg>
                </div>
              </div>

              {discs.map((disc, di) => (
                <section
                  key={disc.number}
                  className="disc-section"
                  aria-label={`Disc ${disc.number}`}
                >
                  {isMultiDisc && (
                    <header className="disc-section-header">
                      <span className="disc-section-title">Disc {disc.number}</span>
                      <span className="disc-section-meta">
                        {disc.tracks.length} {disc.tracks.length === 1 ? 'track' : 'tracks'}
                      </span>
                    </header>
                  )}

                  <ol
                    className="track-list"
                    start={di === 0 ? undefined : 1}
                    aria-label={`Track listing for ${album.name}${isMultiDisc ? `, disc ${disc.number}` : ''}`}
                  >
                    {disc.tracks.map(({ song, index: i }) => {
                      const isCurrentTrack = currentTrack?.id === song.id;
                      const isStarred = starredSongs.has(song.id);
                      const trackNum = song.track ?? i + 1;

                      return (
                        <TrackRow
                          key={song.id}
                          song={song}
                          index={i}
                          isCurrentTrack={isCurrentTrack}
                          isPlaying={isPlaying}
                          isStarred={isStarred}
                          trackNumber={trackNum}
                          albumArtist={album.artist}
                          onClick={() => handleTrackClick(song, i)}
                          onToggleStar={e => toggleStar(song, e)}
                          onContextMenu={e => openMenu(e, song)}
                        />
                      );
                    })}
                  </ol>
                </section>
              ))}

              {/* Stats */}
              <AlbumStats album={album} discCount={discs.length} />
            </>
          ) : !loading ? (
            <div style={{ color: 'var(--text-secondary)', fontSize: 14, padding: '24px 0' }}>
              No tracks found for this album.
            </div>
          ) : null}
        </div>

        {/* Sidebar */}
        <div className="album-sidebar">
          {loading ? (
            <SidebarSkeleton />
          ) : (
            <>
              {/* Credits */}
              {album && (
                <div className="credits-panel">
                  <div className="credits-title">Credits</div>
                  <div className="credit-row">
                    <div className="credit-role">Artist</div>
                    <div className="credit-name">{album.artist}</div>
                  </div>
                  {album.year && (
                    <div className="credit-row">
                      <div className="credit-role">Released</div>
                      <div className="credit-name">{album.year}</div>
                    </div>
                  )}
                  {album.genre && (
                    <div className="credit-row">
                      <div className="credit-role">Genre</div>
                      <div className="credit-name">{album.genre}</div>
                    </div>
                  )}
                </div>
              )}

              {/* More by artist */}
              {relatedAlbums.length > 0 && album && (
                <div className="credits-panel" style={{ marginTop: 16 }}>
                  <div className="credits-title">More by {album.artist}</div>
                  {relatedAlbums.map(rel => (
                    <div
                      key={rel.id}
                      className="related-album-item"
                    >
                      <div
                        className={`related-album-art ${artClass(rel.id)}${rel.coverArt ? ' expandable-image' : ''}`}
                        role={rel.coverArt ? 'button' : undefined}
                        tabIndex={rel.coverArt ? 0 : -1}
                        aria-label={rel.coverArt ? `View larger image of ${rel.name} cover art` : undefined}
                        onClick={e => {
                          e.stopPropagation();
                          if (rel.coverArt) {
                            setLightbox({
                              src: getCoverArtUrl(config, rel.coverArt, 1200),
                              alt: `${rel.name} cover art`,
                            });
                          }
                        }}
                        onKeyDown={e => {
                          if (rel.coverArt && (e.key === 'Enter' || e.key === ' ')) {
                            e.preventDefault();
                            setLightbox({
                              src: getCoverArtUrl(config, rel.coverArt, 1200),
                              alt: `${rel.name} cover art`,
                            });
                          }
                        }}
                      >
                        <CoverArt coverArt={rel.coverArt} id={rel.id} size={80} alt="" />
                      </div>
                      <div
                        className="related-album-info"
                        role="button"
                        tabIndex={0}
                        aria-label={`View album ${rel.name}`}
                        onClick={() => navigate(`/album/${rel.id}`)}
                        onKeyDown={e => e.key === 'Enter' && navigate(`/album/${rel.id}`)}
                      >
                        <div className="related-album-title">{rel.name}</div>
                        {rel.year && <div className="related-album-year">{rel.year}</div>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
      {menuPortal}
      {showPlaylistDialog && album?.song && (
        <AddToPlaylistDialog
          songIds={album.song.map(s => s.id)}
          onClose={() => setShowPlaylistDialog(false)}
        />
      )}
      <ImageLightbox
        src={lightbox?.src}
        alt={lightbox?.alt ?? ''}
        open={!!lightbox}
        onClose={() => setLightbox(null)}
      />
    </>
  );
}

// ── Album Stats ───────────────────────────────────────────────────────────────
function AlbumStats({ album, discCount }: { album: Album & { song: Song[] }; discCount: number }) {
  const songs = album.song ?? [];
  const totalSec = songs.reduce((acc, s) => acc + (s.duration ?? 0), 0);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  const totalStr = h > 0
    ? `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
    : `${m}:${s.toString().padStart(2, '0')}`;

  // Detect format from first song with suffix
  const firstSong = songs.find(s => s.suffix || s.bitRate);
  const format = firstSong?.suffix?.toUpperCase() ?? '—';
  const bitRate = firstSong?.bitRate;

  return (
    <div className="album-stats">
      <div className="album-stat">
        <div className="album-stat-val">{songs.length}</div>
        <div className="album-stat-label">Tracks</div>
      </div>
      {discCount > 1 && (
        <div className="album-stat">
          <div className="album-stat-val">{discCount}</div>
          <div className="album-stat-label">Discs</div>
        </div>
      )}
      <div className="album-stat">
        <div className="album-stat-val">{totalStr}</div>
        <div className="album-stat-label">Duration</div>
      </div>
      {album.year && (
        <div className="album-stat">
          <div className="album-stat-val">{album.year}</div>
          <div className="album-stat-label">Released</div>
        </div>
      )}
      {format !== '—' && (
        <div className="album-stat">
          <div className="album-stat-val">{format}</div>
          <div className="album-stat-label">Format</div>
        </div>
      )}
      {bitRate && (
        <div className="album-stat">
          <div className="album-stat-val">{bitRate}</div>
          <div className="album-stat-label">kbps</div>
        </div>
      )}
    </div>
  );
}

// ── Skeletons ─────────────────────────────────────────────────────────────────
function TrackListSkeleton() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {Array.from({ length: 10 }, (_, i) => (
        <div key={i} style={{ display: 'grid', gridTemplateColumns: '36px 1fr auto', gap: 12, alignItems: 'center', padding: '8px 8px' }}>
          <Skeleton w={18} h={14} style={{ margin: 'auto' }} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            <Skeleton w={`${50 + Math.random() * 35}%`} h={13} />
          </div>
          <Skeleton w={30} h={12} />
        </div>
      ))}
    </div>
  );
}

function SidebarSkeleton() {
  return (
    <div className="credits-panel">
      <Skeleton w={60} h={10} style={{ marginBottom: 14 }} />
      {Array.from({ length: 4 }, (_, i) => (
        <div key={i} style={{ marginBottom: 12 }}>
          <Skeleton w={50} h={10} style={{ marginBottom: 4 }} />
          <Skeleton w={`${60 + Math.random() * 30}%`} h={13} />
        </div>
      ))}
    </div>
  );
}
