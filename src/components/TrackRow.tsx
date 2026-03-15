import type { Song } from '../api/subsonic';
import { CoverArt, artClass } from './CoverArt';
import { fmt, IconPlay, IconPause, IconHeart } from './ui';
import { TrackMoreButton } from './TrackMenu';

export interface TrackRowProps {
  song: Song;
  index: number;
  isCurrentTrack: boolean;
  isPlaying: boolean;
  isStarred: boolean;
  /** Number shown in the # column — e.g. song.track ?? i+1 for albums, i+1 for playlists */
  trackNumber: number | string;
  onClick: () => void;
  onToggleStar: (e: React.MouseEvent) => void;
  /** Show album art thumbnail (playlist / search context) */
  showArt?: boolean;
  /** Show album name column (playlist context) */
  showAlbum?: boolean;
  /** Always show artist name below title (true for playlists/search, false lets album page hide when same as album artist) */
  alwaysShowArtist?: boolean;
  /** Album artist — if provided and matches song.artist, artist is hidden (only when alwaysShowArtist is false) */
  albumArtist?: string;
  onAlbumClick?: () => void;
  /** Additional CSS class name for the row */
  className?: string;
  /** Right-click handler for context menu (provided by useTrackMenu) */
  onContextMenu?: (e: React.MouseEvent) => void;
  /** Remove track callback (playlist editing context) */
  onRemove?: (e: React.MouseEvent) => void;
}

export function TrackRow({
  song,
  // index kept in interface for callers but not used internally
  isCurrentTrack,
  isPlaying,
  isStarred,
  trackNumber,
  onClick,
  onToggleStar,
  showArt = false,
  showAlbum = false,
  alwaysShowArtist = false,
  albumArtist,
  onAlbumClick,
  className,
  onContextMenu,
  onRemove,
}: TrackRowProps) {
  const isCurrentPlaying = isCurrentTrack && isPlaying;
  const showArtist = alwaysShowArtist || song.artist !== albumArtist;

  const rowClass = showAlbum ? 'pl-track-row' : 'track-row';

  return (
    <li
      className={`${rowClass}${isCurrentTrack ? ' playing' : ''}${className ? ` ${className}` : ''}`}
      role="row"
      tabIndex={0}
      aria-label={`${song.title} by ${song.artist}${showAlbum ? `, from ${song.album}` : ''}, ${fmt(song.duration)}`}
      onClick={onClick}
      onKeyDown={e => (e.key === 'Enter' || e.key === ' ') && onClick()}
      onContextMenu={onContextMenu}
    >
      {/* Track number / playing indicator */}
      <div className="track-num" aria-hidden="true">
        {isCurrentTrack ? (
          <div className="playing-bars" aria-label="Now playing">
            <span /><span /><span />
          </div>
        ) : (
          <span>{trackNumber}</span>
        )}
      </div>

      {/* Hover play/pause icon */}
      <div className="track-play-icon" aria-hidden="true">
        {isCurrentPlaying ? <IconPause size={13} /> : <IconPlay size={14} />}
      </div>

      {/* Art + title + artist */}
      {showArt ? (
        <div className="pl-track-main">
          <div className={`pl-track-art ${artClass(song.albumId)}`}>
            <CoverArt coverArt={song.coverArt} id={song.albumId} size={80} alt="" />
          </div>
          <div className="pl-track-info">
            <div className="track-title">{song.title}</div>
            {showArtist && <div className="track-artist">{song.artist}</div>}
          </div>
        </div>
      ) : (
        <div className="track-main">
          <div className="track-title">{song.title}</div>
          {showArtist && <div className="track-artist">{song.artist}</div>}
        </div>
      )}

      {/* Album name (playlist context) */}
      {showAlbum && (
        <div
          className="pl-track-album"
          onClick={e => { e.stopPropagation(); onAlbumClick?.(); }}
          role="link"
          tabIndex={-1}
          aria-label={`Go to album ${song.album}`}
        >
          {song.album}
        </div>
      )}

      {/* Like + more + remove + duration */}
      <div className="track-meta">
        <button
          className={`track-like${isStarred ? ' liked' : ''}`}
          aria-label={isStarred ? `Unlike ${song.title}` : `Like ${song.title}`}
          aria-pressed={isStarred}
          onClick={onToggleStar}
        >
          <IconHeart filled={isStarred} />
        </button>
        <TrackMoreButton song={song} />
        {onRemove && (
          <button
            className="track-remove-btn"
            aria-label={`Remove ${song.title} from playlist`}
            onClick={onRemove}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        )}
        <span>{fmt(song.duration)}</span>
      </div>
    </li>
  );
}
