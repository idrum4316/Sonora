import { useEffect, useState } from 'react';
import { useStore } from '../../store/useStore';
import { getCoverArtUrl } from '../../api/subsonic';
import type { Artist } from '../../api/subsonic';
import { artClass } from '../../components/CoverArt';
import { AlbumCardSkeleton } from '../../components/ui';

// ── Types ─────────────────────────────────────────────────────────────────────
export type ViewMode = 'grid' | 'list';
export type AlbumSort = 'newest' | 'recent' | 'frequent' | 'random';
export const ALBUM_SORT_LABELS: Record<AlbumSort, string> = {
  newest: 'Newest',
  recent: 'Recently Played',
  frequent: 'Most Played',
  random: 'Random',
};

// ── Hook: compute column count from container width ──
export function useGridColumns(containerRef: React.RefObject<HTMLElement | null>, minColWidth = 160, gap = 16) {
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

// ── ArtistListRow ─────────────────────────────────────────────────────────────
export function ArtistListRow({ artist, onNavigate }: {
  artist: Artist;
  onNavigate: () => void;
}) {
  const config = useStore(s => s.config);
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

// ── ViewToggle ────────────────────────────────────────────────────────────────
export function ViewToggle({ view, onChange }: { view: ViewMode; onChange: (v: ViewMode) => void }) {
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
export function IconSort() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="4" y1="6" x2="11" y2="6"/><line x1="4" y1="12" x2="17" y2="12"/><line x1="4" y1="18" x2="23" y2="18"/>
    </svg>
  );
}

export function IconChevronDown() {
  return (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="6 9 12 15 18 9"/>
    </svg>
  );
}

// ── Skeletons ─────────────────────────────────────────────────────────────────
export function ArtistsPageSkeleton({ view }: { view: ViewMode }) {
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

export function PlaylistCardSkeleton() {
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

export function StarredSkeleton() {
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
