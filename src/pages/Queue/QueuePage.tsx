import { useState, useCallback, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useStore } from '../../store/useStore';
import { star, unstar } from '../../api/subsonic';
import { CoverArt, artClass } from '../../components/CoverArt';
import { QueueItem } from '../../components/QueueItem';
import {
  fmt, fmtDuration,
  IconPlay, IconPause, IconPrev, IconNext,
  IconShuffle, IconRepeat, IconHeart,
} from '../../components/ui';
import type { RepeatMode } from '../../store/useStore';

function useDragReorder(moveInQueue: (from: number, to: number) => void) {
  const dragIdx = useRef<number | null>(null);
  const [dragOver, setDragOver] = useState<{ index: number; half: 'top' | 'bottom' } | null>(null);

  const handleDragStart = (realIndex: number) => (e: React.DragEvent) => {
    dragIdx.current = realIndex;
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (realIndex: number) => (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const half = e.clientY < rect.top + rect.height / 2 ? 'top' : 'bottom';
    setDragOver({ index: realIndex, half });
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (dragIdx.current !== null && dragOver) {
      const from = dragIdx.current;
      const to = dragOver.half === 'top' ? dragOver.index : dragOver.index + 1;
      if (from !== to && from + 1 !== to) {
        moveInQueue(from, to);
      }
    }
    dragIdx.current = null;
    setDragOver(null);
  };

  const handleDragEnd = () => {
    dragIdx.current = null;
    setDragOver(null);
  };

  return { dragOver, handleDragStart, handleDragOver, handleDrop, handleDragEnd };
}

type QueueTab = 'queue' | 'history';

export function QueuePage() {
  const navigate = useNavigate();
  const {
    currentTrack, queue, queueIndex, playHistory, isPlaying,
    currentTime, duration, shuffle, repeat,
    togglePlay, next, prev, seekTo, playTrack,
    toggleShuffle, setRepeat, starCurrentTrack,
    clearQueue, removeFromQueue, moveInQueue,
    config,
  } = useStore();

  const [activeTab, setActiveTab] = useState<QueueTab>('queue');
  const progressRef = useRef<HTMLDivElement>(null);
  const { dragOver, handleDragStart, handleDragOver, handleDrop, handleDragEnd } = useDragReorder(moveInQueue);

  const toggleStarInQueue = useCallback((song: import('../../api/subsonic').Song, queueIdx: number) => {
    if (!config) return;
    const wasStarred = !!song.starred;
    const updated = { ...song, starred: wasStarred ? undefined : new Date().toISOString() };
    const newQueue = queue.map((s, i) => i === queueIdx ? updated : s);
    const updates: Record<string, unknown> = { queue: newQueue };
    if (queueIdx === queueIndex) updates.currentTrack = updated;
    useStore.setState(updates);
    (wasStarred ? unstar(config, song.id) : star(config, song.id)).catch(() => {
      const revertQueue = useStore.getState().queue.map((s, i) => i === queueIdx && s.id === song.id ? song : s);
      const revertUpdates: Record<string, unknown> = { queue: revertQueue };
      if (queueIdx === queueIndex) revertUpdates.currentTrack = song;
      useStore.setState(revertUpdates);
    });
  }, [config, queue, queueIndex]);

  const handleProgressClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const rect = progressRef.current!.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    seekTo(ratio * duration);
  }, [seekTo, duration]);

  const cycleRepeat = useCallback(() => {
    const modes: RepeatMode[] = ['none', 'all', 'one'];
    const idx = modes.indexOf(repeat);
    setRepeat(modes[(idx + 1) % modes.length]);
  }, [repeat, setRepeat]);

  const upNext = queue.slice(queueIndex + 1);
  const totalRemaining = upNext.reduce((s, t) => s + (t.duration || 0), 0);
  const progressPct = duration > 0 ? (currentTime / duration) * 100 : 0;

  // Empty state — no queue at all
  if (!currentTrack && queue.length === 0) {
    return (
      <div className="qp-empty">
        <div className="qp-empty-icon" aria-hidden="true">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 18V5l12-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="18" cy="16" r="3" />
          </svg>
        </div>
        <h2 className="qp-empty-title">Your queue is empty</h2>
        <p className="qp-empty-sub">Play something to get started</p>
        <button className="btn btn-secondary" onClick={() => navigate('/')}>Browse Music</button>
      </div>
    );
  }

  const track = currentTrack!;
  const isStarred = !!track.starred;

  return (
    <div className="qp">
      {/* ── Queue column ── */}
      <div className="qp-col">
        <div className="qp-col-header">
          <h1 className="qp-col-title">Queue</h1>
          <p className="qp-col-sub">
            {track.album} &middot; {track.artist}
          </p>
          <div className="qp-tab-row">
            <div className="tab-bar" role="tablist" aria-label="Queue tabs" style={{ border: 'none', paddingBottom: 0 }}>
              <button
                className={`tab${activeTab === 'queue' ? ' active' : ''}`}
                role="tab"
                aria-selected={activeTab === 'queue'}
                onClick={() => setActiveTab('queue')}
              >
                Queue
              </button>
              <button
                className={`tab${activeTab === 'history' ? ' active' : ''}`}
                role="tab"
                aria-selected={activeTab === 'history'}
                onClick={() => setActiveTab('history')}
              >
                History
              </button>
            </div>
            <div style={{ flex: 1 }} />
            {activeTab === 'queue' && upNext.length > 0 && (
              <div className="qp-actions">
                <button
                  className="btn btn-secondary btn-sm"
                  aria-label="Clear queue"
                  onClick={clearQueue}
                >
                  Clear
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="qp-col-scroll" role="list" aria-label={activeTab === 'queue' ? 'Playback queue' : 'Play history'}>
          {activeTab === 'queue' ? (
            <>
              {/* Now Playing */}
              <div className="qp-section">
                <div className="qp-section-label">Now Playing</div>
                <QueueItem
                  song={track}
                  isCurrent
                  isStarred={!!track.starred}
                  onClick={togglePlay}
                  onToggleStar={() => toggleStarInQueue(track, queueIndex)}
                  showHandle={false}
                />
              </div>

              {/* Up Next */}
              {upNext.length > 0 && (
                <div className="qp-section">
                  <div className="qp-section-label">
                    Up Next &middot; {upNext.length} {upNext.length === 1 ? 'track' : 'tracks'} &middot; {fmtDuration(totalRemaining)}
                  </div>
                  {upNext.map((song, i) => {
                    const realIndex = queueIndex + 1 + i;
                    return (
                      <QueueItem
                        key={`${song.id}-${realIndex}`}
                        song={song}
                        isStarred={!!song.starred}
                        onClick={() => playTrack(song, queue, realIndex)}
                        onRemove={() => removeFromQueue(realIndex)}
                        onToggleStar={() => toggleStarInQueue(song, realIndex)}
                        showHandle
                        draggable
                        onDragStart={handleDragStart(realIndex)}
                        onDragOver={handleDragOver(realIndex)}
                        onDrop={handleDrop}
                        onDragEnd={handleDragEnd}
                        isDragOverTop={dragOver?.index === realIndex && dragOver?.half === 'top'}
                        isDragOverBottom={dragOver?.index === realIndex && dragOver?.half === 'bottom'}
                      />
                    );
                  })}
                </div>
              )}

              {upNext.length === 0 && (
                <div className="qp-section">
                  <div className="qp-section-label">Up Next</div>
                  <div className="qp-inline-empty">
                    No more tracks in queue
                  </div>
                </div>
              )}
            </>
          ) : (
            <>
              {playHistory.length > 0 ? (
                <div className="qp-section">
                  <div className="qp-section-label">Previously Played</div>
                  {playHistory.map((song, i) => (
                    <QueueItem
                      key={`${song.id}-hist-${i}`}
                      song={song}
                      isHistory
                      onClick={() => playTrack(song)}
                      showHandle={false}
                    />
                  ))}
                </div>
              ) : (
                <div className="qp-inline-empty" style={{ marginTop: 32 }}>
                  No play history yet
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* ── Now Playing sidebar ── */}
      <aside className="qp-sidebar" aria-label="Now playing details">
        <div className="qp-sidebar-scroll">
          {/* Art */}
          <div className={`qp-sidebar-art ${artClass(track.albumId || track.id)}`}>
            <CoverArt
              coverArt={track.coverArt}
              id={track.albumId || track.id}
              size={480}
              alt={`${track.album} cover art`}
            />
          </div>

          {/* Track info */}
          <h2 className="qp-sidebar-title">{track.title}</h2>
          <div className="qp-sidebar-artist">
            <Link to={`/artist/${track.artistId}`}>{track.artist}</Link>
          </div>
          <div className="qp-sidebar-album">
            <Link to={`/album/${track.albumId}`}>{track.album}</Link>
          </div>

          {/* Actions */}
          <div className="qp-sidebar-actions">
            <button
              className={`btn btn-secondary btn-sm${isStarred ? ' liked' : ''}`}
              aria-label={isStarred ? `Unlike ${track.title}` : `Like ${track.title}`}
              aria-pressed={isStarred}
              onClick={starCurrentTrack}
            >
              <IconHeart filled={isStarred} size={14} />
              {isStarred ? 'Liked' : 'Like'}
            </button>
          </div>

          {/* Progress */}
          <div className="qp-sidebar-progress">
            <div className="qp-sidebar-progress-row">
              <span className="qp-sidebar-time" aria-label={`Current time: ${fmt(Math.floor(currentTime))}`}>
                {fmt(Math.floor(currentTime))}
              </span>
              <div
                ref={progressRef}
                className="qp-sidebar-track"
                role="slider"
                aria-valuemin={0}
                aria-valuemax={Math.floor(duration)}
                aria-valuenow={Math.floor(currentTime)}
                aria-label="Seek"
                tabIndex={0}
                onClick={handleProgressClick}
                onKeyDown={e => {
                  if (e.key === 'ArrowRight') seekTo(Math.min(duration, currentTime + 5));
                  if (e.key === 'ArrowLeft') seekTo(Math.max(0, currentTime - 5));
                }}
              >
                <div className="qp-sidebar-fill" style={{ width: `${progressPct}%` }} />
              </div>
              <span className="qp-sidebar-time qp-sidebar-time--end" aria-label={`Duration: ${fmt(Math.floor(duration))}`}>
                {fmt(Math.floor(duration))}
              </span>
            </div>

            {/* Controls */}
            <div className="qp-sidebar-controls" role="group" aria-label="Playback controls">
              <button
                className={`qp-s-ctrl${shuffle ? ' active' : ''}`}
                aria-label="Shuffle"
                aria-pressed={shuffle}
                onClick={toggleShuffle}
              >
                <IconShuffle size={18} />
              </button>
              <button className="qp-s-ctrl" aria-label="Previous track" onClick={prev}>
                <IconPrev size={22} />
              </button>
              <button
                className="qp-s-play"
                aria-label={isPlaying ? 'Pause' : 'Play'}
                aria-pressed={isPlaying}
                onClick={togglePlay}
              >
                {isPlaying ? <IconPause size={20} /> : <IconPlay size={20} />}
              </button>
              <button className="qp-s-ctrl" aria-label="Next track" onClick={next}>
                <IconNext size={22} />
              </button>
              <button
                className={`qp-s-ctrl${repeat !== 'none' ? ' active' : ''}`}
                aria-label={`Repeat: ${repeat}`}
                onClick={cycleRepeat}
                style={{ position: 'relative' }}
              >
                <IconRepeat size={18} />
                {repeat === 'one' && <span className="qp-repeat-badge">1</span>}
              </button>
            </div>
          </div>

          {/* Link to full player */}
          <button
            className="btn btn-secondary qp-full-player-link"
            aria-label="Open full player view"
            onClick={useStore.getState().toggleNowPlaying}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <polyline points="15 3 21 3 21 9" /><polyline points="9 21 3 21 3 15" />
              <line x1="21" y1="3" x2="14" y2="10" /><line x1="3" y1="21" x2="10" y2="14" />
            </svg>
            Full Player View
          </button>
        </div>
      </aside>
    </div>
  );
}
