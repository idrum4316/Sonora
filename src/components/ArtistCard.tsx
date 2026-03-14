import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../store/useStore';
import { getCoverArtUrl } from '../api/subsonic';
import { artClass } from './CoverArt';

interface ArtistLike {
  id: string;
  name: string;
  albumCount?: number;
  artistImageUrl?: string;
  coverArt?: string;
}

interface ArtistCardProps {
  artist: ArtistLike;
  /** 'grid' = square image card (default, for browse page)
   *  'circle' = round avatar with name below (for shelves / similar sections) */
  variant?: 'grid' | 'circle';
  /** Fixed px width for circle variant; omit for responsive */
  size?: number;
  onClick?: () => void;
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map(w => w[0]?.toUpperCase() ?? '')
    .join('');
}

export function ArtistCard({ artist, variant = 'grid', size, onClick }: ArtistCardProps) {
  const navigate = useNavigate();
  const config = useStore(s => s.config);
  const [imgFailed, setImgFailed] = useState(false);

  const handleClick = onClick ?? (() => navigate(`/artist/${artist.id}`));
  const cls = artClass(artist.id);

  const imageUrl = imgFailed
    ? undefined
    : artist.artistImageUrl ||
      (config && artist.coverArt ? getCoverArtUrl(config, artist.coverArt, variant === 'grid' ? 400 : 200) : undefined);

  // ── Circle variant ──────────────────────────────────────────────────────────
  if (variant === 'circle') {
    const outerStyle = size != null
      ? { width: size, flexShrink: 0 as const }
      : { width: '100%' };
    const photoStyle = size != null
      ? { width: size, height: size }
      : { width: '100%', aspectRatio: '1' as const };

    return (
      <div
        className="artist-bubble"
        style={outerStyle}
        role="listitem"
        tabIndex={0}
        aria-label={`View artist: ${artist.name}`}
        onClick={handleClick}
        onKeyDown={e => e.key === 'Enter' && handleClick()}
      >
        <div className={`artist-bubble-photo ${cls}`} style={photoStyle}>
          {imageUrl ? (
            <img
              src={imageUrl}
              alt=""
              style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center top' }}
              loading="lazy"
              onError={() => setImgFailed(true)}
            />
          ) : (
            <div className="artist-bubble-monogram" aria-hidden="true">
              {initials(artist.name)}
            </div>
          )}
        </div>
        <div className="artist-bubble-name">{artist.name}</div>
      </div>
    );
  }

  // ── Grid variant ────────────────────────────────────────────────────────────
  return (
    <div
      className={`artist-card ${cls}`}
      role="listitem"
      tabIndex={0}
      aria-label={`${artist.name}${artist.albumCount ? `, ${artist.albumCount} ${artist.albumCount === 1 ? 'album' : 'albums'}` : ''}`}
      onClick={handleClick}
      onKeyDown={e => e.key === 'Enter' && handleClick()}
    >
      {imageUrl ? (
        <img
          src={imageUrl}
          alt=""
          className="artist-card-img"
          loading="lazy"
          onError={() => setImgFailed(true)}
        />
      ) : (
        <div className="artist-card-monogram" aria-hidden="true">
          {initials(artist.name)}
        </div>
      )}
      <div className="artist-card-overlay">
        <div className="artist-card-name">{artist.name}</div>
        {artist.albumCount != null && artist.albumCount > 0 && (
          <div className="artist-card-sub">
            {artist.albumCount} {artist.albumCount === 1 ? 'album' : 'albums'}
          </div>
        )}
      </div>
    </div>
  );
}
