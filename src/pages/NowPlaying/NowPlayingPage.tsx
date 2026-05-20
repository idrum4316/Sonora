import { useCallback, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useStore } from '../../store/useStore';
import { CoverArt, artClass } from '../../components/CoverArt';
import { QueueItem } from '../../components/QueueItem';
import {
  fmt,
  IconPlay, IconPause, IconPrev, IconNext,
  IconShuffle, IconRepeat, IconHeart,
  IconVolumeUp, IconVolumeMute, IconVolumeLow, IconChevronDown,
} from '../../components/ui';
import { useImageColors } from '../../utils/useImageColors';
import { useSliderDrag } from '../../utils/useSliderDrag';
import { getCoverArtUrl } from '../../api/subsonic';
import type { RepeatMode } from '../../store/useStore';

// Fallback colors when image extraction isn't available
const FALLBACK_COLORS: [string, string] = ['#7B6CF6', '#E07A5F'];

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

type PanelTab = 'queue' | 'lyrics' | 'related';

const PANEL_TABS: { id: PanelTab; label: string }[] = [
  { id: 'queue', label: 'Up Next' },
  { id: 'lyrics', label: 'Lyrics' },
  { id: 'related', label: 'Related' },
];

export function NowPlayingPage() {
  const toggleNowPlaying = useStore(s => s.toggleNowPlaying);
  const {
    currentTrack, queue, queueIndex, isPlaying, currentTime, duration,
    volume, isMuted, shuffle, repeat, config,
    togglePlay, next, prev, seekTo, setVolume, toggleMute,
    toggleShuffle, setRepeat, playTrack, starCurrentTrack, moveInQueue,
  } = useStore();

  const [activeTab, setActiveTab] = useState<PanelTab>('queue');
  const progressRef = useRef<HTMLDivElement>(null);
  const volumeRef = useRef<HTMLDivElement>(null);
  const volumeDrag = useSliderDrag(volumeRef, setVolume);
  const { dragOver, handleDragStart, handleDragOver, handleDrop, handleDragEnd } = useDragReorder(moveInQueue);

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

  // If nothing is playing, don't render
  if (!currentTrack) {
    return null;
  }

  const track = currentTrack;
  const isStarred = !!track.starred;
  const progressPct = duration > 0 ? (currentTime / duration) * 100 : 0;

  const coverArtUrl = track.coverArt && config
    ? getCoverArtUrl(config, track.coverArt, 128)
    : undefined;
  const [colorA, colorB] = useImageColors(coverArtUrl, FALLBACK_COLORS);

  const upNext = queue.slice(queueIndex + 1);
  const effectiveVolume = isMuted ? 0 : volume;

  const VolumeIcon = effectiveVolume === 0 ? IconVolumeMute : effectiveVolume < 0.5 ? IconVolumeLow : IconVolumeUp;

  return (
    <div
      className="np-page"
      style={{ '--np-color-a': colorA, '--np-color-b': colorB } as React.CSSProperties}
    >
      {/* Ambient background — soft color orbs derived from the artwork */}
      <div className="np-bg" aria-hidden="true">
        <div className="np-bg-orb np-bg-orb--a" />
        <div className="np-bg-orb np-bg-orb--b" />
        <div className="np-bg-veil" />
      </div>

      <div className="np-shell" role="main" aria-label="Full player view">

        {/* ── Top bar ── */}
        <header className="np-topbar">
          <div className="np-topbar-side np-topbar-side--start">
            <button
              className="np-close-btn"
              onClick={toggleNowPlaying}
              aria-label="Minimize player"
            >
              <IconChevronDown size={16} />
            </button>
          </div>
          <div className="np-topbar-center">Now Playing</div>
          <div className="np-topbar-side np-topbar-side--end" aria-hidden="true" />
        </header>

        {/* ── Content ── */}
        <div className="np-content">

          {/* Hero — artwork + metadata + controls in one centered column */}
          <div className="np-hero">

            <div className="np-art-stage">
              <div className={`np-art ${artClass(track.albumId || track.id)}`}>
                <CoverArt
                  coverArt={track.coverArt}
                  id={track.albumId || track.id}
                  size={800}
                  alt={`${track.album} cover art`}
                />
              </div>
            </div>

            <div className="np-meta">
              <div className="np-eyebrow">
                <Link to={`/album/${track.albumId}`} onClick={toggleNowPlaying}>
                  {track.album}
                </Link>
                {track.year ? <span className="np-eyebrow-year"> · {track.year}</span> : null}
              </div>
              <h1 className="np-track-title" title={track.title}>{track.title}</h1>
              <div className="np-track-artist">
                <Link to={`/artist/${track.artistId}`} onClick={toggleNowPlaying}>
                  {track.artist}
                </Link>
              </div>
            </div>

            {/* Progress */}
            <div className="np-progress-row">
              <span className="np-time" aria-label={`Current time: ${fmt(Math.floor(currentTime))}`}>
                {fmt(Math.floor(currentTime))}
              </span>
              <div
                ref={progressRef}
                className="np-progress-track"
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
                <div className="np-progress-fill" style={{ width: `${progressPct}%` }} />
              </div>
              <span className="np-time end" aria-label={`Duration: ${fmt(Math.floor(duration))}`}>
                {fmt(Math.floor(duration))}
              </span>
            </div>

            {/* Playback buttons */}
            <div className="np-ctrl-row" role="group" aria-label="Playback controls">
              <button
                className={`np-ctrl${shuffle ? ' active' : ''}`}
                aria-label="Shuffle"
                aria-pressed={shuffle}
                onClick={toggleShuffle}
              >
                <IconShuffle size={18} />
              </button>
              <button
                className="np-ctrl np-ctrl-skip"
                aria-label="Previous track"
                onClick={prev}
              >
                <IconPrev size={24} />
              </button>
              <button
                className="np-play"
                aria-label={isPlaying ? 'Pause' : 'Play'}
                aria-pressed={isPlaying}
                onClick={togglePlay}
              >
                {isPlaying ? <IconPause size={24} /> : <IconPlay size={24} />}
              </button>
              <button
                className="np-ctrl np-ctrl-skip"
                aria-label="Next track"
                onClick={next}
              >
                <IconNext size={24} />
              </button>
              <button
                className={`np-ctrl${repeat !== 'none' ? ' active' : ''}`}
                aria-label={`Repeat: ${repeat}`}
                onClick={cycleRepeat}
              >
                <IconRepeat size={18} />
                {repeat === 'one' && <span className="np-repeat-badge">1</span>}
              </button>
            </div>

            {/* Extras: like / volume / quality */}
            <div className="np-extras-row">
              <div className="np-extras-cell np-extras-cell--start">
                <button
                  className={`np-like-btn${isStarred ? ' active' : ''}`}
                  aria-label={isStarred ? `Unlike ${track.title}` : `Like ${track.title}`}
                  aria-pressed={isStarred}
                  onClick={starCurrentTrack}
                >
                  <IconHeart filled={isStarred} size={17} />
                </button>
              </div>

              <div className="np-extras-cell np-extras-cell--center">
                <div className="np-volume-row" role="group" aria-label="Volume">
                  <button
                    className="np-vol-icon"
                    aria-label={isMuted ? 'Unmute' : 'Mute'}
                    onClick={toggleMute}
                  >
                    <VolumeIcon size={15} />
                  </button>
                  <div
                    ref={volumeRef}
                    className="np-vol-track"
                    role="slider"
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={Math.round(effectiveVolume * 100)}
                    aria-label="Volume"
                    tabIndex={0}
                    onMouseDown={volumeDrag.onMouseDown}
                    onTouchStart={volumeDrag.onTouchStart}
                    onKeyDown={e => {
                      if (e.key === 'ArrowRight') setVolume(Math.min(1, volume + 0.05));
                      if (e.key === 'ArrowLeft') setVolume(Math.max(0, volume - 0.05));
                    }}
                  >
                    <div className="np-vol-fill" style={{ width: `${effectiveVolume * 100}%` }} />
                  </div>
                </div>
              </div>

              <div className="np-extras-cell np-extras-cell--end">
                {track.suffix && (
                  <span className="np-quality" title="Source quality">
                    {track.suffix.toUpperCase()}
                    {track.bitRate ? ` · ${track.bitRate}k` : ''}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Queue / Lyrics / Related */}
          <aside className="np-side-panel" aria-label="Queue and lyrics">
            <div className="np-panel-tabs" role="tablist">
              {PANEL_TABS.map(tab => (
                <button
                  key={tab.id}
                  className={`np-panel-tab${activeTab === tab.id ? ' active' : ''}`}
                  role="tab"
                  aria-selected={activeTab === tab.id}
                  onClick={() => setActiveTab(tab.id)}
                >
                  {tab.label}
                </button>
              ))}
            </div>
            <div className="np-panel-content" role="tabpanel">
              {activeTab === 'queue' && (
                <>
                  <div className="queue-section-label">Now Playing</div>
                  <QueueItem
                    song={track}
                    isCurrent
                    compact
                    onClick={togglePlay}
                  />

                  {upNext.length > 0 && (
                    <>
                      <div className="queue-section-label">
                        Up Next <span className="queue-section-count">{upNext.length}</span>
                      </div>
                      {upNext.map((song, i) => {
                        const realIndex = queueIndex + 1 + i;
                        return (
                          <QueueItem
                            key={`${song.id}-${i}`}
                            song={song}
                            compact
                            onClick={() => playTrack(song, queue, realIndex)}
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
                    </>
                  )}

                  {upNext.length === 0 && (
                    <div className="np-panel-empty">
                      <div className="np-panel-empty-title">No upcoming tracks</div>
                      <div className="np-panel-empty-sub">Add songs to the queue to keep the music going.</div>
                    </div>
                  )}
                </>
              )}

              {activeTab === 'lyrics' && (
                <div className="np-panel-empty">
                  <div className="np-panel-empty-title">Lyrics not available</div>
                  <div className="np-panel-empty-sub">We couldn't find lyrics for this track.</div>
                </div>
              )}

              {activeTab === 'related' && (
                <div className="np-panel-empty">
                  <div className="np-panel-empty-title">Related tracks coming soon</div>
                  <div className="np-panel-empty-sub">Discover similar music based on what you're listening to.</div>
                </div>
              )}
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
