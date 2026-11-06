import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { useStore } from '../../../core/store';
import {
  getAlbumList, getPlaylists, getGenres, getArtists,
} from '../../../core/subsonic';
import type { Album, Playlist, Genre, Artist } from '../../../core/subsonic';
import { AlbumCard } from '../../components/AlbumCard';
import { ArtistCard } from '../../components/ArtistCard';
import { CoverArt, artClass } from '../../components/CoverArt';
import { AlbumCardSkeleton } from '../../components/ui';
import { IconPlay as IconPlayUI } from '../../components/ui';
import { genreGradient } from '../../utils/genreGradients';

// ── Greeting helper ─────────────────────────────────────────────────────────
function getGreeting(username: string): { time: string; greeting: string } {
  const h = new Date().getHours();
  const name = username ? `, ${username.charAt(0).toUpperCase() + username.slice(1)}` : '';
  if (h < 5)  return { time: 'Late Night',    greeting: `Still up${name}?` };
  if (h < 12) return { time: 'Good Morning',  greeting: `Good Morning${name}` };
  if (h < 17) return { time: 'Good Afternoon', greeting: `Good Afternoon${name}` };
  if (h < 21) return { time: 'Good Evening',  greeting: `Good Evening${name}` };
  return       { time: 'Good Night',          greeting: `Good Night${name}` };
}



// ── HomePage ─────────────────────────────────────────────────────────────────
export function HomePage() {
  const config = useStore(s => s.config)!;
  const navigate = useNavigate();

  const [heroAlbum, setHeroAlbum] = useState<Album | null>(null);
  const [recentAlbums, setRecentAlbums] = useState<Album[]>([]);
  const [newAlbums, setNewAlbums] = useState<Album[]>([]);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [genres, setGenres] = useState<Genre[]>([]);
  const [artists, setArtists] = useState<Artist[]>([]);
  const [loading, setLoading] = useState(true);

  const { time, greeting } = getGreeting(config.username);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const [rand, recent, newest, pls, gens, arts] = await Promise.allSettled([
          getAlbumList(config, 'random', 1),
          getAlbumList(config, 'recent', 12),
          getAlbumList(config, 'newest', 12),
          getPlaylists(config),
          getGenres(config),
          getArtists(config),
        ]);
        if (cancelled) return;
        if (rand.status === 'fulfilled' && rand.value[0]) setHeroAlbum(rand.value[0]);
        if (recent.status === 'fulfilled') setRecentAlbums(recent.value);
        if (newest.status === 'fulfilled') setNewAlbums(newest.value);
        if (pls.status === 'fulfilled') setPlaylists(pls.value);
        if (gens.status === 'fulfilled') setGenres(gens.value.slice(0, 8));
        if (arts.status === 'fulfilled') setArtists(arts.value.slice(0, 10));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [config]);

  const playAlbum = useStore(s => s.playAlbum);

  const playPlaylist = useStore(s => s.playPlaylist);

  return (
    <>
      {/* ── Hero ── */}
      <HeroSection album={heroAlbum} loading={loading} onPlay={playAlbum} />

      {/* ── Greeting ── */}
      <div style={{ padding: '32px 32px 0' }}>
        <div style={{ fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-tertiary)', marginBottom: 4 }}>
          {time}
        </div>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 600, letterSpacing: '-0.5px' }}>
          {greeting}
        </h2>
      </div>

      {/* ── Quick Play ── */}
      {(loading || playlists.length > 0) && (
        <div style={{ padding: '24px 32px 0' }}>
          <div
            style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}
            role="list"
            aria-label="Quick play playlists"
          >
            {loading
              ? Array.from({ length: 6 }, (_, i) => <QuickItemSkeleton key={i} />)
              : playlists.slice(0, 6).map((pl, i) => (
                  <QuickItem key={pl.id} playlist={pl} index={i} onPlay={() => playPlaylist(pl)} />
                ))}
          </div>
        </div>
      )}

      {/* ── Recently Played ── */}
      <PageSection title="Recently Played" seeAllLabel="See all" onSeeAll={() => navigate('/library/albums')}>
        <div className="shelf" role="list" aria-label="Recently played albums">
          {loading
            ? Array.from({ length: 6 }, (_, i) => <AlbumCardSkeleton key={i} width={160} />)
            : recentAlbums.map(a => (
                <AlbumCard key={a.id} album={a} width={160} onPlay={playAlbum} onClick={a => navigate(`/album/${a.id}`)} />
              ))}
        </div>
      </PageSection>

      {/* ── Browse by Genre/Mood ── */}
      {(loading || genres.length > 0) && (
        <PageSection title="Browse by Mood">
          <div
            style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}
            role="list"
            aria-label="Browse by mood or genre"
          >
            {loading
              ? Array.from({ length: 8 }, (_, i) => (
                  <div key={i} className="skeleton" style={{ height: 72, borderRadius: 'var(--radius-md)' }} />
                ))
              : genres.slice(0, 8).map((g, i) => (
                  <MoodCard key={g.value} genre={g} index={i} />
                ))}
          </div>
        </PageSection>
      )}

      {/* ── Artists You Love ── */}
      {(loading || artists.length > 0) && (
        <PageSection title="Artists You Love" seeAllLabel="All artists" onSeeAll={() => navigate('/library/artists')}>
          <div className="shelf" role="list" aria-label="Favourite artists">
            {loading
              ? Array.from({ length: 6 }, (_, i) => <ArtistBubbleSkeleton key={i} />)
              : artists.map(artist => (
                  <ArtistCard key={artist.id} artist={artist} variant="circle" size={140} />
                ))}
          </div>
        </PageSection>
      )}

      {/* ── Recently Added ── */}
      <PageSection title="Recently Added" seeAllLabel="Browse all" onSeeAll={() => navigate('/library/albums')}>
        <div className="albums-grid" role="list" aria-label="Recently added albums">
          {loading
            ? Array.from({ length: 6 }, (_, i) => <AlbumCardSkeleton key={i} />)
            : newAlbums.slice(0, 12).map(a => (
                <AlbumCard key={a.id} album={a} onPlay={playAlbum} onClick={a => navigate(`/album/${a.id}`)} />
              ))}
        </div>
      </PageSection>

      <div style={{ height: 48 }} aria-hidden="true" />
    </>
  );
}

// ── Hero Section ──────────────────────────────────────────────────────────────
function HeroSection({ album, loading, onPlay }: { album: Album | null; loading: boolean; onPlay: (a: Album) => void }) {
  const navigate = useNavigate();
  const albumMeta = album
    ? [album.year, album.genre, album.songCount ? `${album.songCount} tracks` : ''].filter(Boolean).join(' · ')
    : '';

  return (
    <section className="home-hero" role="banner">
      <div className={`home-featured-card${loading ? ' is-loading' : ''}`} style={{ animation: 'fadeUp 500ms ease both' }}>
        {loading ? (
          <>
            <div className="home-featured-art-shell">
              <div className="home-featured-art-skeleton skeleton" />
            </div>
            <div className="home-featured-copy">
              <div className="home-featured-eyebrow skeleton" />
              <div className="home-featured-title-skeleton skeleton" />
              <div className="home-featured-line-skeleton skeleton" />
              <div className="home-featured-meta-skeleton skeleton" />
            </div>
          </>
        ) : album ? (
          <>
            <div className="home-featured-art-shell">
              <button
                type="button"
                className={`home-featured-art ${artClass(album.id)}`}
                onClick={() => navigate(`/album/${album.id}`)}
                aria-label={`View album ${album.name}`}
              >
                <CoverArt coverArt={album.coverArt} id={album.id} size={520} alt={`${album.name} cover art`} />
              </button>
            </div>

            <div className="home-featured-copy">
              <div className="home-featured-eyebrow">
                <span className="home-featured-pulse" aria-hidden="true" />
                Featured Album
              </div>
              <h1
                className="home-featured-title"
                onClick={() => navigate(`/album/${album.id}`)}
                role="link"
                tabIndex={0}
                onKeyDown={e => e.key === 'Enter' && navigate(`/album/${album.id}`)}
              >
                {album.name}
              </h1>
              <p className="home-featured-artist">{album.artist}</p>
              {albumMeta && <p className="home-featured-meta">{albumMeta}</p>}
              <div className="home-featured-actions">
                <button
                  className="btn btn-accent home-featured-play"
                  aria-label={`Play ${album.name}`}
                  onClick={() => onPlay(album)}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><polygon points="5,3 19,12 5,21"/></svg>
                  Play now
                </button>
                <button
                  type="button"
                  className="home-featured-link"
                  onClick={() => navigate(`/album/${album.id}`)}
                >
                  Explore album
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="home-featured-empty">No albums found in your library.</div>
        )}
      </div>
    </section>
  );
}

// ── Quick Item ────────────────────────────────────────────────────────────────
function QuickItem({ playlist, onPlay }: { playlist: Playlist; index?: number; onPlay: () => void }) {
  return (
    <div
      className="quick-item"
      role="listitem"
      tabIndex={0}
      aria-label={`Play ${playlist.name}`}
      onClick={onPlay}
      onKeyDown={e => (e.key === 'Enter' || e.key === ' ') && onPlay()}
      style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '10px 14px', cursor: 'pointer', transition: 'background var(--transition)', overflow: 'hidden' }}
    >
      <div className={`sidebar-playlist-art ${artClass(playlist.id)}`} style={{ width: 44, height: 44, borderRadius: 'var(--radius-sm)', flexShrink: 0, overflow: 'hidden' }}>
        {playlist.coverArt && <CoverArt coverArt={playlist.coverArt} id={playlist.id} size={88} alt="" />}
      </div>
      <span style={{ fontSize: 13.5, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
        {playlist.name}
      </span>
      <div style={{ marginLeft: 'auto', flexShrink: 0, width: 32, height: 32, borderRadius: '50%', background: 'var(--text-primary)', color: 'var(--bg)', display: 'grid', placeItems: 'center' }} aria-hidden="true">
        <IconPlayUI size={14} />
      </div>
    </div>
  );
}

function QuickItemSkeleton() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '10px 14px', overflow: 'hidden' }}>
      <div className="skeleton" style={{ width: 44, height: 44, borderRadius: 'var(--radius-sm)', flexShrink: 0 }} />
      <div className="skeleton" style={{ height: 13, flex: 1, borderRadius: 4 }} />
    </div>
  );
}

// ── Mood Card ─────────────────────────────────────────────────────────────────
function MoodCard({ genre, index }: { genre: Genre; index: number }) {
  const navigate = useNavigate();
  const accent = genreGradient(genre.value, index);
  return (
    <div
      className="mood-card"
      role="listitem"
      tabIndex={0}
      aria-label={`Browse ${genre.value} music`}
      style={{ borderTop: `2px solid ${accent}` }}
      onClick={() => navigate(`/genre/${encodeURIComponent(genre.value)}`)}
      onKeyDown={e => e.key === 'Enter' && navigate(`/genre/${encodeURIComponent(genre.value)}`)}
    >
      <div className="mood-card-dot" style={{ background: accent }} />
      <div>
        <div className="mood-card-name">{genre.value}</div>
        <div className="mood-card-count">
          {genre.songCount.toLocaleString()} {genre.songCount === 1 ? 'track' : 'tracks'}
        </div>
      </div>
    </div>
  );
}

// ── Artist Bubble Skeleton ────────────────────────────────────────────────────
function ArtistBubbleSkeleton() {
  return (
    <div style={{ width: 140, textAlign: 'center', flexShrink: 0 }}>
      <div className="skeleton" style={{ width: 140, height: 140, borderRadius: '50%', margin: '0 auto' }} />
      <div className="skeleton" style={{ height: 13, width: 100, borderRadius: 4, margin: '10px auto 0' }} />
    </div>
  );
}

// ── Page Section ──────────────────────────────────────────────────────────────
function PageSection({ title, seeAllLabel, onSeeAll, children }: { title: string; seeAllLabel?: string; onSeeAll?: () => void; children: React.ReactNode }) {
  return (
    <div style={{ padding: '36px 32px 0' }}>
      <div className="section-header">
        <h2 className="section-title">{title}</h2>
        {seeAllLabel && (
          <span
            className="section-link"
            role="button"
            tabIndex={0}
            onClick={onSeeAll}
            onKeyDown={e => e.key === 'Enter' && onSeeAll?.()}
          >
            {seeAllLabel}
          </span>
        )}
      </div>
      {children}
    </div>
  );
}
