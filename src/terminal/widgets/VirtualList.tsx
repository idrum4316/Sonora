import { useEffect, useRef, type ReactNode } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { useStore } from '../../core/store';
import type { PaneState } from '../nav';
import { ROW_HEIGHT } from '../nav';
import { Spinner } from './Glyphs';
import { ItemRow } from './ItemRow';

interface VirtualListProps {
  id: string;
  label: string;
  pane: PaneState;
  focused: boolean;
  /** The current track's row, for lists that can hold a track twice. Otherwise it's found by id. */
  currentRow?: number;
  /** Dims rows above `currentRow`, for a queue where those have already played. */
  dimPlayed?: boolean;
  showKind?: boolean;
  /** Lowercase text to pick out in each row's name, for search results. */
  highlight?: string;
  emptyText: ReactNode;
  onSelect: (index: number) => void;
  onActivate: (index: number) => void;
}

/** Rows kept between the cursor and the edge of the list when it scrolls, like vim's scrolloff. */
const SCROLL_MARGIN = ROW_HEIGHT * 2;

export function VirtualList({ id, label, pane, focused, currentRow, dimPlayed, showKind, highlight, emptyText, onSelect, onActivate }: VirtualListProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const currentId = useStore(s => s.currentTrack?.id);
  const isPlaying = useStore(s => s.isPlaying);

  const { items, cursor } = pane;
  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 12,
    scrollPaddingStart: SCROLL_MARGIN,
    scrollPaddingEnd: SCROLL_MARGIN,
  });

  useEffect(() => {
    if (items.length) virtualizer.scrollToIndex(cursor, { align: 'auto' });
  }, [cursor, items.length, virtualizer]);

  // Follow the focused pane with DOM focus, so assistive tech hears the active row.
  useEffect(() => {
    if (focused) scrollRef.current?.focus({ preventScroll: true });
  }, [focused]);

  let message: ReactNode = null;
  if (pane.error) message = pane.error;
  else if (!items.length) message = pane.loading ? null : emptyText;

  return (
    <div
      ref={scrollRef}
      className={`t-list${focused ? ' is-focused' : ''}${pane.loading && items.length ? ' is-stale' : ''}`}
      role="listbox"
      aria-label={label}
      aria-busy={pane.loading}
      tabIndex={-1}
      aria-activedescendant={items.length ? `${id}-${cursor}` : undefined}
    >
      {pane.loading && !items.length && <p className="t-list-message t-loading"><Spinner /> loading</p>}
      {message && <p className={`t-list-message${pane.error ? ' is-error' : ''}`}>{message}</p>}
      <div style={{ height: virtualizer.getTotalSize(), position: 'relative' }}>
        {virtualizer.getVirtualItems().map(row => {
          const item = items[row.index];
          const isCurrent = item.kind === 'song' && currentId === item.song.id
            && (currentRow === undefined || row.index === currentRow);
          const selected = row.index === cursor;
          const played = dimPlayed && currentRow !== undefined && row.index < currentRow;
          return (
            <div
              key={row.index}
              id={`${id}-${row.index}`}
              className={`t-row t-row-${item.kind}${selected ? ' is-selected' : ''}${isCurrent ? ' is-current' : ''}${played ? ' is-played' : ''}`}
              role="option"
              aria-selected={selected}
              style={{ transform: `translateY(${row.start}px)` }}
              onClick={() => onSelect(row.index)}
              onDoubleClick={() => onActivate(row.index)}
            >
              <ItemRow item={item} showKind={showKind} highlight={highlight} playback={isCurrent ? (isPlaying ? 'playing' : 'paused') : undefined} />
            </div>
          );
        })}
      </div>
    </div>
  );
}
