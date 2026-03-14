import { useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../../store/useStore';
import { CoverArt, artClass } from '../CoverArt';
import { fmt, IconPlay, IconPause, IconPrev, IconNext, IconShuffle, IconRepeat, IconHeart, IconVolumeUp, IconVolumeMute } from '../ui';
import type { RepeatMode } from '../../store/useStore';

export function PlayerBar() {
  const navigate = useNavigate();
  const {
    currentTrack, isPlaying, currentTime, duration,
    volume, isMuted, shuffle, repeat,
    togglePlay, next, prev, seekTo, setVolume, toggleMute,
    toggleShuffle, setRepeat,
    starCurrentTrack,
  } = useStore();

  const progressRef = useRef<HTMLDivElement>(null);
  const volumeRef = useRef<HTMLDivElement>(null);

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

  const progressPct = duration > 0 ? (currentTime / duration) * 100 : 0;
  const track = currentTrack;
  const isStarred = !!track?.starred;

  return (
    <footer className="player-bar" role="region" aria-label="Music player">

      {/* Now Playing */}
      <div className="player-track">
        {track ? (
          <>
            <div
              className={`player-art ${artClass(track.albumId || track.id)}`}
              onClick={() => navigate('/now-playing')}
              role="link"
              aria-label="Open full player"
            >
              <CoverArt coverArt={track.coverArt} id={track.albumId || track.id} size={100} alt={track.album} />
            </div>
            <div className="player-track-info">
              <div className="player-track-title" title={track.title}>{track.title}</div>
              <div className="player-track-artist" title={track.artist}>{track.artist}</div>
            </div>
            <button
              className={`player-like-btn${isStarred ? ' liked' : ''}`}
              aria-label={isStarred ? `Unlike ${track.title}` : `Like ${track.title}`}
              aria-pressed={isStarred}
              onClick={starCurrentTrack}
            >
              <IconHeart filled={isStarred} />
            </button>
          </>
        ) : (
          <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>Nothing playing</span>
        )}
      </div>

      {/* Controls + Progress */}
      <div className="player-center">
        <div className="player-controls" role="group" aria-label="Playback controls">
          <button
            className={`ctrl-btn${shuffle ? ' active' : ''}`}
            aria-label="Shuffle" aria-pressed={shuffle}
            onClick={toggleShuffle}
          >
            <IconShuffle />
          </button>
          <button className="ctrl-btn" aria-label="Previous track" onClick={prev} disabled={!track}>
            <IconPrev />
          </button>
          <button
            className="ctrl-btn-play"
            aria-label={isPlaying ? 'Pause' : 'Play'}
            aria-pressed={isPlaying}
            onClick={togglePlay}
            disabled={!track}
          >
            {isPlaying ? <IconPause /> : <IconPlay />}
          </button>
          <button className="ctrl-btn" aria-label="Next track" onClick={next} disabled={!track}>
            <IconNext />
          </button>
          <button
            className={`ctrl-btn${repeat !== 'none' ? ' active' : ''}`}
            aria-label={`Repeat: ${repeat}`}
            onClick={cycleRepeat}
            style={{ position: 'relative' }}
          >
            <IconRepeat />
            {repeat === 'one' && (
              <span style={{ position: 'absolute', bottom: 2, right: 2, fontSize: 8, fontWeight: 700, color: 'var(--accent)' }}>1</span>
            )}
          </button>
        </div>

        <div className="player-progress" role="group" aria-label="Track progress">
          <span className="player-time" aria-label={`Current time: ${fmt(Math.floor(currentTime))}`}>
            {fmt(Math.floor(currentTime))}
          </span>
          <div
            ref={progressRef}
            className="progress-track"
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
            <div className="progress-fill" style={{ width: `${progressPct}%` }} />
          </div>
          <span className="player-time end" aria-label={`Duration: ${fmt(Math.floor(duration))}`}>
            {fmt(Math.floor(duration))}
          </span>
        </div>
      </div>

      {/* Extras */}
      <div className="player-extras" role="group" aria-label="Player extras">
        <div className="volume-group" role="group" aria-label="Volume">
          <button
            className="ctrl-btn"
            aria-label={isMuted ? 'Unmute' : 'Mute'}
            onClick={toggleMute}
          >
            {isMuted || volume === 0 ? <IconVolumeMute /> : <IconVolumeUp />}
          </button>
          <div
            ref={volumeRef}
            className="volume-slider"
            role="slider"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round((isMuted ? 0 : volume) * 100)}
            aria-label="Volume"
            tabIndex={0}
            onClick={handleVolumeClick}
            onKeyDown={e => {
              if (e.key === 'ArrowRight') setVolume(Math.min(1, volume + 0.05));
              if (e.key === 'ArrowLeft') setVolume(Math.max(0, volume - 0.05));
            }}
          >
            <div className="volume-fill" style={{ width: `${(isMuted ? 0 : volume) * 100}%` }} />
          </div>
        </div>
      </div>

    </footer>
  );
}
