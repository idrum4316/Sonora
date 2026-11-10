import type { Album } from '../../core/subsonic';
import { CoverArt, artClass } from './CoverArt';

interface AlbumCardProps {
  album: Album;
  width?: number;
  /** Replaces the default "artist · year" line */
  subtitle?: string;
  onPlay?: (album: Album) => void;
  onClick?: (album: Album) => void;
}

export function AlbumCard({ album, width, subtitle, onPlay, onClick }: AlbumCardProps) {
  const fallbackClass = artClass(album.id);

  return (
    <div
      className="album-card"
      style={width ? { width } : undefined}
      role="listitem"
      tabIndex={0}
      aria-label={`${album.name} by ${album.artist}`}
      onClick={() => onClick?.(album)}
      onKeyDown={e => (e.key === 'Enter' || e.key === ' ') && onClick?.(album)}
    >
      <div className={`album-card-art ${fallbackClass}`}>
        <CoverArt coverArt={album.coverArt} id={album.id} size={500} alt="" />
        <div className="album-card-play">
          <button
            className="album-card-play-btn"
            aria-label={`Play ${album.name}`}
            onClick={e => { e.stopPropagation(); onPlay?.(album); }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <polygon points="5,3 19,12 5,21" />
            </svg>
          </button>
        </div>
      </div>
      <div className="album-card-info">
        <div className="album-card-title">{album.name}</div>
        <div className="album-card-sub">
          {subtitle ?? `${album.artist}${album.year ? ` · ${album.year}` : ''}`}
        </div>
      </div>
    </div>
  );
}
