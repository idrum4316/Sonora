import { useEffect, useRef, type ReactNode } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { useStore } from '../../core/store';
import { reducedMotion } from '../motion';
import type { PaneState } from '../nav';
import { ROW_HEIGHT } from '../nav';
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
  /** Wipes new contents in. Off for lists that change while you watch, like the queue. */
  reveal?: boolean;
  emptyText: ReactNode;
  onSelect: (index: number) => void;
  onActivate: (index: number) => void;
}

/** Rows kept between the cursor and the edge of the list when it scrolls, like vim's scrolloff. */
const SCROLL_MARGIN = ROW_HEIGHT * 2;
/** The cursor glides between nearby rows. Further than this, it would only streak past the viewport. */
const GLIDE_ROWS = 12;
/** A skeleton's rows, as widths in characters, so loading doesn't look like a uniform block. */
const SKELETON = [26, 18, 31, 22, 15, 28, 20, 33, 17, 24];
/** New contents arriving faster than this are the cursor being held down, so don't animate them. */
const REVEAL_QUIET_MS = 260;

export function VirtualList({ id, label, pane, focused, currentRow, dimPlayed, showKind, highlight, reveal, emptyText, onSelect, onActivate }: VirtualListProps) {
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

  const lastCursor = useRef(cursor);
  const glides = Math.abs(cursor - lastCursor.current) <= GLIDE_ROWS;
  useEffect(() => { lastCursor.current = cursor; }, [cursor]);

  const first = items[0];
  const contents = `${items.length}:${first?.kind}:${first?.kind === 'song' ? first.song.id : first?.kind === 'album' ? first.album.id : ''}`;
  const lastContents = useRef(contents);
  const lastChange = useRef(0);
  useEffect(() => {
    if (contents === lastContents.current) return;
    lastContents.current = contents;
    const now = performance.now();
    const quiet = now - lastChange.current > REVEAL_QUIET_MS;
    lastChange.current = now;
    if (!reveal || !quiet || !items.length || reducedMotion()) return;
    scrollRef.current?.animate(
      [{ clipPath: 'inset(0 0 100% 0)', opacity: 0.2 }, { clipPath: 'inset(0 0 0% 0)', opacity: 1 }],
      { duration: 200, easing: 'cubic-bezier(0.2, 0.7, 0.2, 1)' },
    );
  }, [contents, reveal, items.length]);

  const viewport = virtualizer.scrollRect;
  const overflowing = !!viewport && virtualizer.getTotalSize() > viewport.height;

  let message: ReactNode = null;
  if (pane.error) message = pane.error;
  else if (!items.length) message = pane.loading ? null : emptyText;

  return (
    <div
      ref={scrollRef}
      className={`t-list${focused ? ' is-focused' : ''}${overflowing ? ' is-overflowing' : ''}${pane.loading && items.length ? ' is-stale' : ''}`}
      role="listbox"
      aria-label={label}
      aria-busy={pane.loading}
      tabIndex={-1}
      aria-activedescendant={items.length ? `${id}-${cursor}` : undefined}
    >
      {pane.loading && !items.length && (
        <div className="t-skeleton" aria-hidden="true">
          {SKELETON.map((width, index) => <span key={index} style={{ width: `min(${width}ch, 90%)`, animationDelay: `${index * 60}ms` }} />)}
        </div>
      )}
      {message && <p className={`t-list-message${pane.error ? ' is-error' : ''}`}>{message}</p>}
      <div style={{ height: virtualizer.getTotalSize(), position: 'relative' }}>
        {items.length > 0 && (
          <div
            className={`t-cursor${glides ? '' : ' is-jumping'}`}
            style={{ transform: `translateY(${cursor * ROW_HEIGHT}px)` }}
          />
        )}
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
