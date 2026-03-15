import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../../store/useStore';
import {
  getAlbumList, getPlaylists, getPlaylist, getGenres, getArtists, getAlbum, getCoverArtUrl,
} from '../../api/subsonic';
import type { Album, Playlist, Genre, Artist } from '../../api/subsonic';
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
  const playTrack = useStore(s => s.playTrack);
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
                  <div key={i} className="skeleton" style={{ aspectRatio: '2/1', borderRadius: 'var(--radius-md)' }} />
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
    </>
  );
}

// ── Hero Section ──────────────────────────────────────────────────────────────
function HeroSection({ album, loading, onPlay }: { album: Album | null; loading: boolean; onPlay: (a: Album) => void }) {
  const config = useStore(s => s.config)!;
  const navigate = useNavigate();

  return (
    <div
      className="hero"
      role="banner"
      style={{
        position: 'relative',
        height: 420,
        overflow: 'hidden',
        display: 'flex',
        alignItems: 'flex-end',
        padding: '0 32px 36px',
      }}
    >
      {/* Backgrounds */}
      <div style={{
        position: 'absolute', inset: 0,
        background: album?.coverArt
          ? 'linear-gradient(135deg, #1a0533 0%, #0e1a3a 50%, #001a1a 100%)'
          : 'linear-gradient(135deg, #1a0533 0%, #0e1a3a 50%, #001a1a 100%)',
      }} />
      {album?.coverArt && (
        <div style={{
          position: 'absolute', inset: -40,
          backgroundImage: `url(${config && album.coverArt ? getCoverArtUrl(config, album.coverArt, 600) : ''})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          filter: 'blur(60px) saturate(1.5)',
          opacity: 0.35,
          transform: 'scale(1.1)',
        }} />
      )}
      <div style={{ position: 'absolute', top: -80, right: 120, width: 520, height: 520, borderRadius: '50%', background: 'radial-gradient(circle, rgba(123,108,246,0.35) 0%, transparent 70%)', pointerEvents: 'none' }} aria-hidden="true" />
      <div style={{ position: 'absolute', bottom: -100, right: -60, width: 400, height: 400, borderRadius: '50%', background: 'radial-gradient(circle, rgba(224,122,95,0.20) 0%, transparent 70%)', pointerEvents: 'none' }} aria-hidden="true" />
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 200, background: 'linear-gradient(to top, var(--bg) 0%, transparent 100%)', pointerEvents: 'none' }} aria-hidden="true" />

      {/* Content */}
      <div style={{ position: 'relative', zIndex: 2, display: 'grid', gridTemplateColumns: 'auto 1fr', gap: 28, alignItems: 'flex-end', width: '100%', animation: 'fadeUp 500ms ease both' }}>
        {loading ? (
          <>
            <div className="skeleton" style={{ width: 200, height: 200, borderRadius: 'var(--radius-lg)', flexShrink: 0 }} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div className="skeleton" style={{ height: 11, width: 100, borderRadius: 4 }} />
              <div className="skeleton" style={{ height: 44, width: 280, borderRadius: 8 }} />
              <div className="skeleton" style={{ height: 18, width: 160, borderRadius: 4 }} />
              <div className="skeleton" style={{ height: 13, width: 120, borderRadius: 4 }} />
            </div>
          </>
        ) : album ? (
          <>
            <div
              style={{ width: 200, height: 200, borderRadius: 'var(--radius-lg)', overflow: 'hidden', boxShadow: '0 24px 64px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.1)', flexShrink: 0, cursor: 'pointer' }}
              className={artClass(album.id)}
              onClick={() => navigate(`/album/${album.id}`)}
              role="link"
              tabIndex={0}
              aria-label={`View album ${album.name}`}
              onKeyDown={e => e.key === 'Enter' && navigate(`/album/${album.id}`)}
            >
              <CoverArt coverArt={album.coverArt} id={album.id} size={400} alt={`${album.name} cover art`} />
            </div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--accent)', marginBottom: 8 }}>
                Featured Album
              </div>
              <h1
                style={{ fontFamily: 'var(--font-display)', fontSize: 42, fontWeight: 700, letterSpacing: '-1.5px', lineHeight: 1.05, color: '#fff', marginBottom: 6, cursor: 'pointer' }}
                onClick={() => navigate(`/album/${album.id}`)}
                role="link"
                tabIndex={0}
                onKeyDown={e => e.key === 'Enter' && navigate(`/album/${album.id}`)}
              >
                {album.name}
              </h1>
              <div style={{ fontSize: 16, color: 'rgba(255,255,255,0.65)', marginBottom: 4 }}>{album.artist}</div>
              <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.38)', marginBottom: 20 }}>
                {[album.year, album.genre, album.songCount ? `${album.songCount} tracks` : ''].filter(Boolean).join(' · ')}
              </div>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <button
                  className="btn btn-primary"
                  aria-label={`Play ${album.name}`}
                  onClick={() => onPlay(album)}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><polygon points="5,3 19,12 5,21"/></svg>
                  Play
                </button>
              </div>
            </div>
          </>
        ) : (
          <div style={{ color: 'var(--text-secondary)', fontSize: 14 }}>No albums found in your library.</div>
        )}
      </div>
    </div>
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
      style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '10px 14px', cursor: 'pointer', transition: 'background var(--transition), transform var(--transition)', overflow: 'hidden' }}
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
  return (
    <div
      className="mood-card"
      role="listitem"
      tabIndex={0}
      aria-label={`Browse ${genre.value} music`}
      style={{
        aspectRatio: '2/1',
        borderRadius: 'var(--radius-md)',
        overflow: 'hidden',
        cursor: 'pointer',
        position: 'relative',
        background: genreGradient(genre.value, index),
        transition: 'transform 200ms',
      }}
      onClick={() => navigate(`/genre/${encodeURIComponent(genre.value)}`)}
      onKeyDown={e => e.key === 'Enter' && navigate(`/genre/${encodeURIComponent(genre.value)}`)}
    >
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0,
        padding: '28px 14px 12px',
        background: 'linear-gradient(to top, rgba(0,0,0,0.7), transparent)',
        fontSize: 14, fontWeight: 600, color: '#fff', letterSpacing: '0.01em',
      }}>
        {genre.value}
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
