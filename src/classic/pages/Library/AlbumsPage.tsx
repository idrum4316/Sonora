import { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router';
import { useVirtualizer } from '@tanstack/react-virtual';
import { useStore } from '../../../core/store';
import { getAllAlbums } from '../../../core/subsonic';
import type { Album } from '../../../core/subsonic';
import { AlbumCard } from '../../components/AlbumCard';
import { AlbumCardSkeleton } from '../../components/ui';
import { LibraryNav } from './LibraryNav';
import { useGridColumns, IconSort, IconChevronDown, ALBUM_SORT_LABELS } from './LibraryShared';
import type { AlbumSort } from './LibraryShared';

export function AlbumsPage() {
  const config = useStore(s => s.config)!;
  const navigate = useNavigate();

  const [albums, setAlbums] = useState<Album[]>([]);
  const [sort, setSort] = useState<AlbumSort>('newest');
  const [loading, setLoading] = useState(false);
  const [showSortMenu, setShowSortMenu] = useState(false);

  useEffect(() => {
    setLoading(true);
    getAllAlbums(config, sort)
      .then(setAlbums)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [config, sort]);

  const playAlbum = useStore(s => s.playAlbum);

  const scrollRef = useRef<HTMLDivElement>(null);
  const gridContainerRef = useRef<HTMLDivElement>(null);
  const columns = useGridColumns(gridContainerRef);
  const rowCount = Math.ceil(albums.length / columns);

  const virtualizer = useVirtualizer({
    count: rowCount,
    getScrollElement: () => scrollRef.current,
    // Rows are measured, since a card's height follows the column width
    estimateSize: useCallback(() => 300, []),
    overscan: 3,
  });

  useEffect(() => {
    const el = gridContainerRef.current;
    if (!el) return;
    let parent = el.parentElement;
    while (parent) {
      const style = getComputedStyle(parent);
      if (style.overflowY === 'auto' || style.overflowY === 'scroll') {
        (scrollRef as React.MutableRefObject<HTMLElement | null>).current = parent as HTMLDivElement;
        virtualizer.measure();
        break;
      }
      parent = parent.parentElement;
    }
  }, [loading]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <>
      <LibraryNav />

      <div className="library-controls">
        <div className="sort-select-wrap">
          <button
            className="sort-select"
            aria-label={`Sort by ${ALBUM_SORT_LABELS[sort]}`}
            aria-expanded={showSortMenu}
            onClick={() => setShowSortMenu(v => !v)}
          >
            <IconSort />
            Sort: {ALBUM_SORT_LABELS[sort]}
            <IconChevronDown />
          </button>
          {showSortMenu && (
            <div className="sort-menu" role="listbox" aria-label="Sort options">
              {(Object.keys(ALBUM_SORT_LABELS) as AlbumSort[]).map(key => (
                <button
                  key={key}
                  className={`sort-menu-item${sort === key ? ' active' : ''}`}
                  role="option"
                  aria-selected={sort === key}
                  onClick={() => { setSort(key); setShowSortMenu(false); }}
                >
                  {ALBUM_SORT_LABELS[key]}
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="spacer" />
      </div>

      <div className="library-content" ref={gridContainerRef}>
        {loading ? (
          <div className="albums-grid" aria-hidden="true">
            {Array.from({ length: 18 }, (_, i) => <AlbumCardSkeleton key={i} />)}
          </div>
        ) : albums.length === 0 ? (
          <div className="library-empty" role="status">
            <p>No albums found.</p>
          </div>
        ) : (
          <div role="list" aria-label={`${albums.length} albums`}>
            <div
              style={{
                height: virtualizer.getTotalSize(),
                width: '100%',
                position: 'relative',
              }}
            >
              {virtualizer.getVirtualItems().map(virtualRow => {
                const startIdx = virtualRow.index * columns;
                const rowAlbums = albums.slice(startIdx, startIdx + columns);
                return (
                  <div
                    key={virtualRow.key}
                    ref={virtualizer.measureElement}
                    data-index={virtualRow.index}
                    className="albums-grid"
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      transform: `translateY(${virtualRow.start}px)`,
                      gridTemplateColumns: `repeat(${columns}, 1fr)`,
                      paddingBottom: 28,
                    }}
                  >
                    {rowAlbums.map(album => (
                      <AlbumCard key={album.id} album={album} onPlay={playAlbum} onClick={a => navigate(`/album/${a.id}`)} />
                    ))}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
