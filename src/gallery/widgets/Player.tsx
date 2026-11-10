import { useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from 'react';
import { fmt } from '../../core/format';
import { useStore } from '../../core/store';
import { getSample } from '../art';
import { useNowPalette, paletteStyle } from '../hooks';
import { albumPath, artistPath, go } from '../router';
import { useIsStarred, useUi } from '../ui';
import { Cover } from './Cover';
import {
  ExpandIcon, HeartIcon, NextIcon, PauseIcon, PlayIcon, PrevIcon, QueueIcon, RepeatIcon, ShuffleIcon, VolumeIcon,
} from './Icons';

/** Where the track is, as a bar you can click or drag along. */
export function Progress({ className, showTimes = true }: { className?: string; showTimes?: boolean }) {
  const currentTime = useStore(s => s.currentTime);
  const duration = useStore(s => s.duration);
  const seekTo = useStore(s => s.seekTo);
  const barRef = useRef<HTMLDivElement>(null);
  const [drag, setDrag] = useState<number | null>(null);
  const [hoverAt, setHoverAt] = useState<number | null>(null);

  const fraction = (e: ReactPointerEvent) => {
    const r = barRef.current!.getBoundingClientRect();
    return Math.min(1, Math.max(0, (e.clientX - r.left) / r.width));
  };
  const valid = duration > 0 && isFinite(duration);
  const shown = drag ?? (valid ? currentTime / duration : 0);

  return (
    <div className={`g-progress ${className ?? ''}`}>
      {showTimes && <span className="g-time">{fmt(Math.floor(valid ? shown * duration : 0))}</span>}
      <div
        ref={barRef}
        className={`g-progress-bar${drag !== null ? ' is-dragging' : ''}`}
        role="slider"
        aria-label="Seek"
        aria-valuemin={0}
        aria-valuemax={Math.floor(duration || 0)}
        aria-valuenow={Math.floor(currentTime)}
        tabIndex={0}
        onKeyDown={e => {
          if (e.key === 'ArrowRight') { e.preventDefault(); e.stopPropagation(); seekTo(Math.min(duration, currentTime + 5)); }
          if (e.key === 'ArrowLeft') { e.preventDefault(); e.stopPropagation(); seekTo(Math.max(0, currentTime - 5)); }
        }}
        onPointerDown={e => {
          if (!valid) return;
          e.currentTarget.setPointerCapture(e.pointerId);
          setDrag(fraction(e));
        }}
        onPointerMove={e => {
          if (!valid) return;
          setHoverAt(fraction(e));
          if (drag !== null) setDrag(fraction(e));
        }}
        onPointerUp={e => {
          if (drag !== null) seekTo(fraction(e) * duration);
          setDrag(null);
        }}
        onPointerLeave={() => setHoverAt(null)}
      >
        <div className="g-progress-track">
          <div className="g-progress-fill" style={{ transform: `scaleX(${shown})` }} />
        </div>
        <div className="g-progress-head" style={{ left: `${shown * 100}%` }} />
        {hoverAt !== null && valid && (
          <span className="g-progress-tip" style={{ left: `${hoverAt * 100}%` }}>{fmt(Math.floor(hoverAt * duration))}</span>
        )}
      </div>
      {showTimes && <span className="g-time">{valid ? fmt(Math.floor(duration)) : '0:00'}</span>}
    </div>
  );
}

export function Transport({ size = 'md' }: { size?: 'md' | 'lg' }) {
  const isPlaying = useStore(s => s.isPlaying);
  const shuffle = useStore(s => s.shuffle);
  const repeat = useStore(s => s.repeat);
  const { togglePlay, next, prev, toggleShuffle, cycleRepeat } = useStore.getState();
  const icon = size === 'lg' ? 26 : 20;
  return (
    <div className={`g-transport is-${size}`}>
      <button className={`g-icon-btn${shuffle ? ' is-on' : ''}`} onClick={toggleShuffle} aria-pressed={shuffle} title="Shuffle">
        <ShuffleIcon size={icon - 4} />
      </button>
      <button className="g-icon-btn" onClick={prev} title="Previous"><PrevIcon size={icon} /></button>
      <button className="g-play" onClick={togglePlay} title={isPlaying ? 'Pause (space)' : 'Play (space)'}>
        {isPlaying ? <PauseIcon size={icon + 2} /> : <PlayIcon size={icon + 2} />}
      </button>
      <button className="g-icon-btn" onClick={next} title="Next"><NextIcon size={icon} /></button>
      <button className={`g-icon-btn${repeat !== 'none' ? ' is-on' : ''}`} onClick={cycleRepeat} title={`Repeat: ${repeat}`}>
        <RepeatIcon size={icon - 4} one={repeat === 'one'} />
      </button>
    </div>
  );
}

export function Volume() {
  const volume = useStore(s => s.volume);
  const isMuted = useStore(s => s.isMuted);
  const { setVolume, toggleMute } = useStore.getState();
  const level = isMuted ? 0 : volume;
  return (
    <div className="g-volume">
      <button className="g-icon-btn" onClick={toggleMute} title={isMuted ? 'Unmute' : 'Mute'}>
        <VolumeIcon size={18} level={level} />
      </button>
      <input
        type="range" min={0} max={1} step={0.01} value={level} aria-label="Volume"
        style={{ '--v': level } as CSSProperties}
        onChange={e => setVolume(Number(e.target.value))}
      />
    </div>
  );
}

export function StarButton({ size = 18 }: { size?: number }) {
  const track = useStore(s => s.currentTrack);
  const starred = useIsStarred(track);
  const setSongStarred = useUi(s => s.setSongStarred);
  return (
    <button className={`g-icon-btn${starred ? ' is-on' : ''}`} onClick={() => track && setSongStarred(track.id, !starred)} aria-pressed={starred} title={starred ? 'Unfavorite' : 'Favorite'}>
      <HeartIcon size={size} filled={starred} />
    </button>
  );
}

/** The player that floats over every view but the stage. */
export function Dock() {
  const track = useStore(s => s.currentTrack);
  const palette = useNowPalette();
  const { queueOpen, setQueueOpen } = useUi();
  if (!track) return null;
  const sample = getSample(track.coverArt);
  return (
    <div className="g-dock" style={paletteStyle(palette)}>
      <div className="g-dock-glow" style={sample ? { background: `#${sample.grid[4]}` } : undefined} />
      <button className="g-dock-art" onClick={() => go('/now')} title="Open the stage (f)">
        <Cover coverArt={track.coverArt} size={160} />
        <span className="g-dock-art-hint"><ExpandIcon size={18} /></span>
      </button>
      <div className="g-dock-meta">
        <button className="g-dock-title" onClick={() => go(albumPath(track.albumId))}>{track.title}</button>
        <button className="g-dock-artist" onClick={() => track.artistId && go(artistPath(track.artistId))}>{track.artist}</button>
      </div>
      <div className="g-dock-center">
        <Transport />
        <Progress />
      </div>
      <div className="g-dock-side">
        <StarButton />
        <Volume />
        <button className={`g-icon-btn${queueOpen ? ' is-on' : ''}`} onClick={() => setQueueOpen(!queueOpen)} title="Queue (q)">
          <QueueIcon size={19} />
        </button>
      </div>
    </div>
  );
}
