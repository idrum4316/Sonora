import type { Song } from '../api/subsonic';
import { CoverArt, artClass } from './CoverArt';
import { fmt, IconHeart } from './ui';

interface QueueItemProps {
  song: Song;
  isCurrent?: boolean;
  isHistory?: boolean;
  isStarred?: boolean;
  onClick: () => void;
  onRemove?: () => void;
  onToggleStar?: (e: React.MouseEvent) => void;
  showHandle?: boolean;
  /** Compact mode for inline panels (smaller art, no handle/remove) */
  compact?: boolean;
  /** Drag-and-drop props for reordering */
  draggable?: boolean;
  onDragStart?: (e: React.DragEvent) => void;
  onDragOver?: (e: React.DragEvent) => void;
  onDrop?: (e: React.DragEvent) => void;
  onDragEnd?: (e: React.DragEvent) => void;
  isDragOverTop?: boolean;
  isDragOverBottom?: boolean;
}

const IconDragHandle = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" />
    <line x1="3" y1="6" x2="3.01" y2="6" /><line x1="3" y1="12" x2="3.01" y2="12" /><line x1="3" y1="18" x2="3.01" y2="18" />
  </svg>
);

const IconRemove = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

export function QueueItem({ song, isCurrent, isHistory, isStarred, onClick, onRemove, onToggleStar, showHandle, compact, draggable, onDragStart, onDragOver, onDrop, onDragEnd, isDragOverTop, isDragOverBottom }: QueueItemProps) {
  const base = compact ? 'q-item-compact' : 'q-item';
  const cls = `${base}${isCurrent ? ` ${base}--playing` : ''}${isHistory ? ` ${base}--history` : ''}${isDragOverTop ? ` ${base}--drag-over-top` : ''}${isDragOverBottom ? ` ${base}--drag-over-bottom` : ''}`;

  return (
    <div
      className={cls}
      role="listitem"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={e => (e.key === 'Enter' || e.key === ' ') && onClick()}
      aria-label={`${isCurrent ? 'Now playing: ' : ''}${song.title} by ${song.artist}, ${fmt(song.duration)}`}
      aria-current={isCurrent || undefined}
      draggable={draggable}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onDragEnd={onDragEnd}
    >
      {!compact && (
        showHandle && !isCurrent ? (
          <div className="q-item-handle" aria-hidden="true"><IconDragHandle /></div>
        ) : isCurrent ? (
          <div className="q-item-indicator" aria-hidden="true">
            <div className="playing-bars"><span /><span /><span /></div>
          </div>
        ) : (
          <div className="q-item-handle" aria-hidden="true" />
        )
      )}

      <div className={`${compact ? 'q-item-compact-art' : 'q-item-art'} ${artClass(song.albumId)}`}>
        <CoverArt coverArt={song.coverArt} id={song.albumId} size={compact ? 72 : 80} alt="" />
      </div>

      <div className={compact ? 'q-item-compact-info' : 'q-item-info'}>
        <div className={compact ? 'q-item-compact-title' : 'q-item-title'}>{song.title}</div>
        <div className={compact ? 'q-item-compact-artist' : 'q-item-artist'}>{song.artist}</div>
      </div>

      <div className={compact ? 'q-item-compact-dur' : 'q-item-end'}>
        {!compact && onToggleStar && (
          <button
            className={`q-item-star${isStarred ? ' liked' : ''}`}
            aria-label={isStarred ? `Unlike ${song.title}` : `Like ${song.title}`}
            aria-pressed={!!isStarred}
            onClick={e => { e.stopPropagation(); onToggleStar(e); }}
          >
            <IconHeart filled={!!isStarred} />
          </button>
        )}
        {!compact && onRemove && !isCurrent && (
          <button
            className="q-item-remove"
            aria-label={`Remove ${song.title} from queue`}
            onClick={e => { e.stopPropagation(); onRemove(); }}
          >
            <IconRemove />
          </button>
        )}
        <span className={compact ? '' : 'q-item-dur'}>{fmt(song.duration)}</span>
      </div>
    </div>
  );
}
