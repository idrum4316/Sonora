import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router';
import { useStore } from '../../../core/store';
import { stripHtml } from '../../../core/format';
import { releaseType } from '../../../core/library';
import { getArtist, getArtistInfo, star, unstar, getCoverArtUrl } from '../../../core/subsonic';
import type { ArtistDetail, ArtistInfo, Album } from '../../../core/subsonic';
import { CoverArt, artClass } from '../../components/CoverArt';
import { ArtistCard } from '../../components/ArtistCard';
import { ImageLightbox } from '../../components/ImageLightbox';
import { Skeleton, IconPlay, IconHeart, IconShuffle, IconExpand } from '../../components/ui';

// ── Helpers ───────────────────────────────────────────────────────────────────
function initials(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map(w => w[0]?.toUpperCase() ?? '')
    .join('');
}

// ── ArtistPage ────────────────────────────────────────────────────────────────
export function ArtistPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const config = useStore(s => s.config)!;

  const [artist, setArtist] = useState<ArtistDetail | null>(null);
  const [info, setInfo] = useState<ArtistInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [followed, setFollowed] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  const photoClass = id ? artClass(id) : 'art-violet';

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    setArtist(null);
    setInfo(null);
    let cancelled = false;

    async function load() {
      try {
        const [detail, artistInfo] = await Promise.allSettled([
          getArtist(config, id!),
          getArtistInfo(config, id!),
        ]);

        if (cancelled) return;

        if (detail.status === 'fulfilled') {
          setArtist(detail.value);
          setFollowed(!!detail.value.starred);
        }
        if (artistInfo.status === 'fulfilled') {
          setInfo(artistInfo.value);
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

  const albums = artist?.album ?? [];
  const sortedAlbums = [...albums].sort((a, b) => (b.year ?? 0) - (a.year ?? 0));

  const playAlbum = useStore(s => s.playAlbum);

  const playAll = useCallback(() => {
    if (!sortedAlbums.length) return;
    navigate(`/album/${sortedAlbums[0].id}`);
  }, [sortedAlbums, navigate]);

  const shuffleAll = useCallback(() => {
    if (!sortedAlbums.length) return;
    const idx = Math.floor(Math.random() * sortedAlbums.length);
    navigate(`/album/${sortedAlbums[idx].id}`);
  }, [sortedAlbums, navigate]);

  const toggleFollow = useCallback(async () => {
    if (!artist) return;
    const wasFollowed = followed;
    setFollowed(v => !v);
    try {
      wasFollowed ? await unstar(config, artist.id) : await star(config, artist.id);
    } catch {
      setFollowed(wasFollowed);
    }
  }, [artist, followed, config]);

  // Best available image: external URL from info, then coverArt from artist
  const photoUrl = info?.largeImageUrl || info?.mediumImageUrl ||
    (artist?.artistImageUrl) ||
    (artist?.coverArt ? getCoverArtUrl(config, artist.coverArt, 400) : undefined);

  // High-res version for the lightbox — re-requests cover art at full size
  const hiResUrl = info?.largeImageUrl ||
    (artist?.artistImageUrl) ||
    (artist?.coverArt ? getCoverArtUrl(config, artist.coverArt, 1200) : undefined);

  const biography = info?.biography ? stripHtml(info.biography) : null;

  const years = albums.map(a => a.year).filter(Boolean) as number[];
  const minYear = years.length ? Math.min(...years) : null;
  const maxYear = years.length ? Math.max(...years) : null;
  const totalTracks = albums.reduce((acc, a) => acc + (a.songCount ?? 0), 0);

  return (
    <>
      {/* ── Hero ── */}
      <div className="artist-hero">
        {/* Blurred photo background */}
        {photoUrl && (
          <div
            aria-hidden="true"
            style={{
              position: 'absolute', inset: -40,
              backgroundImage: `url(${photoUrl})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              filter: 'blur(80px) saturate(1.4)',
              opacity: 0.2,
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

        <div className="artist-hero-inner" style={{ animation: 'fadeUp 400ms ease both' }}>
          {/* Artist photo */}
          <div className="artist-photo-wrap">
            {loading ? (
              <div className="skeleton artist-photo" />
            ) : (
              <div
                className={`artist-photo expandable-image ${photoClass}`}
                role="button"
                tabIndex={photoUrl ? 0 : -1}
                aria-label={photoUrl ? `View larger image of ${artist?.name ?? 'artist'}` : undefined}
                onClick={() => { if (photoUrl) setLightboxOpen(true); }}
                onKeyDown={e => { if (photoUrl && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); setLightboxOpen(true); } }}
              >
                {photoUrl ? (
                  <>
                    <img
                      src={photoUrl}
                      alt={`${artist?.name ?? ''} photo`}
                      style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center top' }}
                    />
                    <button
                      className="expandable-image-expand"
                      onClick={e => { e.stopPropagation(); setLightboxOpen(true); }}
                      aria-label={`View larger image of ${artist?.name ?? 'artist'}`}
                      tabIndex={-1}
                    >
                      <IconExpand size={14} />
                    </button>
                  </>
                ) : (
                  <div className="artist-photo-monogram" aria-hidden="true">
                    {artist ? initials(artist.name) : ''}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Info */}
          <div className="artist-info">
            <div className="album-type-badge">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M9 18V5l12-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="18" cy="16" r="3" />
              </svg>
              Artist
            </div>

            {loading ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <Skeleton w={280} h={48} style={{ borderRadius: 10 }} />
                <Skeleton w={160} h={14} />
                <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
                  <Skeleton w={80} h={38} style={{ borderRadius: 999 }} />
                  <Skeleton w={100} h={38} style={{ borderRadius: 999 }} />
                  <Skeleton w={90} h={38} style={{ borderRadius: 999 }} />
                </div>
              </div>
            ) : artist ? (
              <>
                <h1 className="artist-hero-name">{artist.name}</h1>

                <div className="album-meta-row">
                  {minYear && (
                    <span className="album-meta-text">
                      {minYear === maxYear ? minYear : `${minYear} – ${maxYear}`}
                    </span>
                  )}
                  {albums.length > 0 && (
                    <>
                      {minYear && <div className="album-meta-dot" aria-hidden="true" />}
                      <span className="album-meta-text">
                        {albums.length} {albums.length === 1 ? 'album' : 'albums'}
                      </span>
                    </>
                  )}
                  {totalTracks > 0 && (
                    <>
                      <div className="album-meta-dot" aria-hidden="true" />
                      <span className="album-meta-text">{totalTracks} tracks</span>
                    </>
                  )}
                </div>

                <div className="album-actions">
                  <button
                    className="btn btn-primary"
                    aria-label={`Play ${artist.name}`}
                    onClick={playAll}
                    disabled={!albums.length}
                  >
                    <IconPlay />
                    Play
                  </button>
                  <button
                    className="btn btn-secondary"
                    aria-label={`Shuffle ${artist.name}`}
                    onClick={shuffleAll}
                    disabled={!albums.length}
                  >
                    <IconShuffle />
                    Shuffle
                  </button>
                  <button
                    className="btn btn-secondary"
                    aria-label={followed ? `Unfollow ${artist.name}` : `Follow ${artist.name}`}
                    aria-pressed={followed}
                    onClick={toggleFollow}
                    style={followed ? { color: 'var(--accent)', borderColor: 'var(--accent-dim)' } : undefined}
                  >
                    <IconHeart filled={followed} />
                    {followed ? 'Following' : 'Follow'}
                  </button>

                </div>
              </>
            ) : null}
          </div>
        </div>
      </div>

      {/* ── Body ── */}
      <div className="artist-body">

        {/* Discography */}
        <section aria-labelledby="discography-heading">
          <div className="section-header" style={{ marginBottom: 20 }}>
            <h2 className="section-title" id="discography-heading">Discography</h2>
            {!loading && albums.length > 0 && (
              <span className="section-meta">{albums.length} releases</span>
            )}
          </div>

          {loading ? (
            <DiscographySkeleton />
          ) : sortedAlbums.length > 0 ? (
            <div
              className="albums-grid"
              role="list"
              aria-label={`${artist?.name ?? 'Artist'} discography`}
            >
              {sortedAlbums.map(album => (
                <AlbumCard
                  key={album.id}
                  album={album}
                  onPlay={() => playAlbum(album)}
                  onClick={() => navigate(`/album/${album.id}`)}
                />
              ))}
            </div>
          ) : (
            <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>No albums found.</p>
          )}
        </section>

        {/* About / Biography */}
        {biography && (
          <section aria-labelledby="about-heading">
            <div className="section-header" style={{ marginBottom: 20 }}>
              <h2 className="section-title" id="about-heading">About</h2>
            </div>
            <div className="artist-about-layout">
              {photoUrl && (
                <div className="artist-about-photo-wrap">
                  <div
                    className="expandable-image"
                    role="button"
                    tabIndex={0}
                    aria-label={`View larger image of ${artist?.name ?? 'artist'}`}
                    onClick={() => setLightboxOpen(true)}
                    onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setLightboxOpen(true); } }}
                    style={{ position: 'relative' }}
                  >
                    <img
                      src={photoUrl}
                      alt=""
                      className="artist-about-photo"
                    />
                    <button
                      className="expandable-image-expand"
                      onClick={e => { e.stopPropagation(); setLightboxOpen(true); }}
                      aria-label={`View larger image of ${artist?.name ?? 'artist'}`}
                      tabIndex={-1}
                    >
                      <IconExpand size={12} />
                    </button>
                  </div>
                </div>
              )}
              <div className="artist-about-text-col">
                <BiographyText text={biography} />
                {info?.lastFmUrl && (
                  <a
                    href={info.lastFmUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="artist-lastfm-link"
                    aria-label={`${artist?.name ?? 'Artist'} on Last.fm (opens in new tab)`}
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                      <polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" />
                    </svg>
                    More on Last.fm
                  </a>
                )}
              </div>
            </div>
          </section>
        )}

        {/* Similar Artists */}
        {info?.similarArtist && info.similarArtist.length > 0 && (
          <section aria-labelledby="similar-heading">
            <div className="section-header" style={{ marginBottom: 20 }}>
              <h2 className="section-title" id="similar-heading">You Might Also Like</h2>
            </div>
            <div className="artist-grid" role="list" aria-label="Similar artists">
              {info.similarArtist.slice(0, 8).map(similar => (
                <ArtistCard
                  key={similar.id}
                  artist={similar}
                  onClick={() => navigate(`/artist/${similar.id}`)}
                />
              ))}
            </div>
          </section>
        )}
      </div>

      <ImageLightbox
        src={hiResUrl}
        alt={artist ? `${artist.name} photo` : 'Artist photo'}
        open={lightboxOpen}
        onClose={() => setLightboxOpen(false)}
      />
    </>
  );
}

// ── Biography with read-more toggle ───────────────────────────────────────────
function BiographyText({ text }: { text: string }) {
  const [expanded, setExpanded] = useState(false);
  const COLLAPSE_LINES = 4;
  const paragraphs = text.split(/\n+/).filter(Boolean);
  const needsTruncation = paragraphs.length > COLLAPSE_LINES || text.length > 500;

  const visible = !needsTruncation || expanded ? paragraphs : paragraphs.slice(0, COLLAPSE_LINES);

  return (
    <div>
      <div className={`artist-bio-text${needsTruncation && !expanded ? ' artist-bio-text--clamped' : ''}`}>
        {visible.map((p, i) => (
          <p key={i} style={{ marginTop: i > 0 ? 10 : 0 }}>{p}</p>
        ))}
      </div>
      {needsTruncation && (
        <button
          className="artist-bio-toggle"
          onClick={() => setExpanded(v => !v)}
          aria-expanded={expanded}
        >
          {expanded ? 'Show less' : 'Read more'}
        </button>
      )}
    </div>
  );
}

// ── AlbumCard ─────────────────────────────────────────────────────────────────
function AlbumCard({ album, onClick, onPlay }: { album: Album; onClick: () => void; onPlay: () => void }) {
  const cls = artClass(album.id);

  const typeLabel = releaseType(album.songCount ?? 0);

  return (
    <div
      className="album-card"
      role="listitem"
      tabIndex={0}
      aria-label={`${album.name}${album.year ? `, ${album.year}` : ''}, ${typeLabel}`}
      onClick={onClick}
      onKeyDown={e => e.key === 'Enter' && onClick()}
    >
      <div className={`album-card-art ${cls}`}>
        <CoverArt coverArt={album.coverArt} id={album.id} size={300} alt="" />
        <div className="album-card-play">
          <button
            className="album-card-play-btn"
            aria-label={`Play ${album.name}`}
            onClick={e => { e.stopPropagation(); onPlay(); }}
          >
            <IconPlay size={18} />
          </button>
        </div>
      </div>
      <div className="album-card-info">
        <div className="album-card-title">{album.name}</div>
        <div className="album-card-sub">
          {[album.year, typeLabel].filter(Boolean).join(' · ')}
        </div>
      </div>
    </div>
  );
}

// ── Skeletons ─────────────────────────────────────────────────────────────────
function DiscographySkeleton() {
  return (
    <div className="albums-grid" aria-hidden="true">
      {Array.from({ length: 6 }, (_, i) => (
        <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <Skeleton style={{ width: '100%', aspectRatio: '1', height: 'auto', borderRadius: 16 }} />
          <Skeleton w="70%" h={13} />
          <Skeleton w="50%" h={11} />
        </div>
      ))}
    </div>
  );
}
