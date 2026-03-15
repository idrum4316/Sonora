import { useCallback, useRef, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
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
import { getCoverArtUrl } from '../../api/subsonic';
import type { RepeatMode } from '../../store/useStore';

// Fallback colors when image extraction isn't available
const FALLBACK_COLORS: [string, string] = ['#667eea', '#764ba2'];

function useDragReorder(moveInQueue: (from: number, to: number) => void) {
  const dragIdx = useRef<number | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);

  const handleDragStart = (realIndex: number) => (e: React.DragEvent) => {
    dragIdx.current = realIndex;
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (realIndex: number) => (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverIdx(realIndex);
  };

  const handleDrop = (realIndex: number) => (e: React.DragEvent) => {
    e.preventDefault();
    if (dragIdx.current !== null && dragIdx.current !== realIndex) {
      moveInQueue(dragIdx.current, realIndex);
    }
    dragIdx.current = null;
    setDragOverIdx(null);
  };

  const handleDragEnd = () => {
    dragIdx.current = null;
    setDragOverIdx(null);
  };

  return { dragOverIdx, handleDragStart, handleDragOver, handleDrop, handleDragEnd };
}

type PanelTab = 'queue' | 'lyrics' | 'related';

export function NowPlayingPage() {
  const navigate = useNavigate();
  const {
    currentTrack, queue, queueIndex, isPlaying, currentTime, duration,
    volume, isMuted, shuffle, repeat, config,
    togglePlay, next, prev, seekTo, setVolume, toggleMute,
    toggleShuffle, setRepeat, playTrack, starCurrentTrack, moveInQueue,
  } = useStore();

  const [activeTab, setActiveTab] = useState<PanelTab>('queue');
  const progressRef = useRef<HTMLDivElement>(null);
  const volumeRef = useRef<HTMLDivElement>(null);
  const { dragOverIdx, handleDragStart, handleDragOver, handleDrop, handleDragEnd } = useDragReorder(moveInQueue);

  const handleProgressClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const rect = progressRef.current!.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    seekTo(ratio * duration);
  }, [seekTo, duration]);

  const handleVolumeClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const rect = volumeRef.current!.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    setVolume(ratio);
  }, [setVolume]);

  const cycleRepeat = useCallback(() => {
    const modes: RepeatMode[] = ['none', 'all', 'one'];
    const idx = modes.indexOf(repeat);
    setRepeat(modes[(idx + 1) % modes.length]);
  }, [repeat, setRepeat]);

  // If nothing is playing, go home
  if (!currentTrack) {
    navigate('/', { replace: true });
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
      {/* Ambient background */}
      <div className="np-bg" aria-hidden="true" />

      <div className="np-shell" role="main" aria-label="Full player view">

        {/* ── Top bar ── */}
        <div className="np-topbar">
          <button
            className="np-close-btn"
            onClick={() => navigate(-1)}
            aria-label="Minimize player"
          >
            <IconChevronDown size={16} />
          </button>
          <div className="np-topbar-center">Now Playing</div>
          <div style={{ width: 36 }} aria-hidden="true" />
        </div>

        {/* ── Content ── */}
        <div className="np-content">

          {/* Artwork column */}
          <div className="np-art-col">
            <div className="np-art-wrap">
              <div className={`np-art ${artClass(track.albumId || track.id)}`}>
                <CoverArt
                  coverArt={track.coverArt}
                  id={track.albumId || track.id}
                  size={600}
                  alt={`${track.album} cover art`}
                />
              </div>
              <div className="np-art-shadow" aria-hidden="true" />
            </div>
          </div>

          {/* Track info + controls column */}
          <div className="np-info-col">
            <h1 className="np-track-title">{track.title}</h1>
            <div className="np-track-artist">
              <Link to={`/artist/${track.artistId}`}>{track.artist}</Link>
            </div>
            <div className="np-track-album">
              <Link to={`/album/${track.albumId}`}>{track.album}</Link>
              {track.year ? <> &middot; {track.year}</> : null}
            </div>

            <div className="np-track-actions">
              <button
                className={`np-like-btn${isStarred ? ' active' : ''}`}
                aria-label={isStarred ? `Unlike ${track.title}` : `Like ${track.title}`}
                aria-pressed={isStarred}
                onClick={starCurrentTrack}
              >
                <IconHeart filled={isStarred} size={20} />
              </button>
            </div>

            <div className="np-controls">
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

              {/* Playback controls */}
              <div className="np-ctrl-row" role="group" aria-label="Playback controls">
                <button
                  className={`np-ctrl${shuffle ? ' active' : ''}`}
                  aria-label="Shuffle"
                  aria-pressed={shuffle}
                  onClick={toggleShuffle}
                >
                  <IconShuffle size={20} />
                </button>
                <button className="np-ctrl" aria-label="Previous track" onClick={prev}>
                  <IconPrev size={28} />
                </button>
                <button
                  className="np-play"
                  aria-label={isPlaying ? 'Pause' : 'Play'}
                  aria-pressed={isPlaying}
                  onClick={togglePlay}
                >
                  {isPlaying ? <IconPause size={28} /> : <IconPlay size={28} />}
                </button>
                <button className="np-ctrl" aria-label="Next track" onClick={next}>
                  <IconNext size={28} />
                </button>
                <button
                  className={`np-ctrl${repeat !== 'none' ? ' active' : ''}`}
                  aria-label={`Repeat: ${repeat}`}
                  onClick={cycleRepeat}
                  style={{ position: 'relative' }}
                >
                  <IconRepeat size={20} />
                  {repeat === 'one' && (
                    <span className="np-repeat-badge">1</span>
                  )}
                </button>
              </div>

              {/* Volume */}
              <div className="np-volume-row" role="group" aria-label="Volume">
                <button
                  className="np-vol-icon"
                  aria-label={isMuted ? 'Unmute' : 'Mute'}
                  onClick={toggleMute}
                >
                  <VolumeIcon size={16} />
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
                  onClick={handleVolumeClick}
                  onKeyDown={e => {
                    if (e.key === 'ArrowRight') setVolume(Math.min(1, volume + 0.05));
                    if (e.key === 'ArrowLeft') setVolume(Math.max(0, volume - 0.05));
                  }}
                >
                  <div className="np-vol-fill" style={{ width: `${effectiveVolume * 100}%` }} />
                </div>
              </div>
            </div>
          </div>

          {/* Queue / Lyrics panel */}
          <div className="np-side-panel">
            <div className="np-panel-tabs" role="tablist">
              {(['queue', 'lyrics', 'related'] as PanelTab[]).map(tab => (
                <button
                  key={tab}
                  className={`np-panel-tab${activeTab === tab ? ' active' : ''}`}
                  role="tab"
                  aria-selected={activeTab === tab}
                  onClick={() => setActiveTab(tab)}
                >
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                </button>
              ))}
            </div>
            <div className="np-panel-content" role="tabpanel">
              {activeTab === 'queue' && (
                <>
                  {/* Current track */}
                  <div className="queue-section-label">Now Playing</div>
                  <QueueItem
                    song={track}
                    isCurrent
                    compact
                    onClick={togglePlay}
                  />

                  {/* Up next */}
                  {upNext.length > 0 && (
                    <>
                      <div className="queue-section-label">Up Next</div>
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
                            onDrop={handleDrop(realIndex)}
                            onDragEnd={handleDragEnd}
                            isDragOver={dragOverIdx === realIndex}
                          />
                        );
                      })}
                    </>
                  )}

                  {upNext.length === 0 && (
                    <div className="np-panel-empty">Queue is empty</div>
                  )}
                </>
              )}

              {activeTab === 'lyrics' && (
                <div className="np-panel-empty">
                  Lyrics not available
                </div>
              )}

              {activeTab === 'related' && (
                <div className="np-panel-empty">
                  Related tracks coming soon
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── Bottom bar ── */}
        <div className="np-bottom">
          <div className="np-bottom-left">
            <Link to={`/album/${track.albumId}`} className="np-bottom-btn" aria-label="View album">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="3"/></svg>
              {track.album}
            </Link>
            <Link to={`/artist/${track.artistId}`} className="np-bottom-btn" aria-label="View artist">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
              {track.artist}
            </Link>
          </div>
          <div className="np-bottom-right">
            {track.suffix && (
              <span className="np-quality">
                {track.suffix.toUpperCase()}
                {track.bitRate ? ` ${track.bitRate}kbps` : ''}
              </span>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
