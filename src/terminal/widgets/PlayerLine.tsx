import { useRef, type MouseEvent } from 'react';
import { fmt } from '../../core/format';
import { useStore } from '../../core/store';
import { starCurrent } from '../commands';
import { openAlbumOf, openArtistOf } from '../nav';
import { NextIcon, PauseIcon, PlayIcon, PrevIcon, StarIcon } from './Icons';
import { Pane } from './Pane';
import { ProgressBar } from './ProgressBar';
import { Spectrum, type CellSize } from './Spectrum';

const VOLUME_CELLS = 10;
const SPECTRUM_CELL: CellSize = { width: 5, height: 3, gapX: 2, gapY: 2 };
/** How far the room's light rises with the low end, on top of the level CSS gives it. */
const AMBIENT_BASE = 0.42;
const AMBIENT_RANGE = 0.58;

function time(seconds: number) {
  return fmt(Math.floor(Number.isFinite(seconds) ? seconds : 0));
}

const REPEAT_LABELS = { none: 'repeat', all: 'repeat all', one: 'repeat one' };

function Volume() {
  const volume = useStore(s => s.volume);
  const isMuted = useStore(s => s.isMuted);
  const toggleMute = useStore(s => s.toggleMute);
  const setVolume = useStore(s => s.setVolume);
  const level = isMuted ? 0 : volume;
  const filled = Math.round(level * VOLUME_CELLS);

  function handleCellsClick(e: MouseEvent<HTMLSpanElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const cell = Math.ceil(((e.clientX - rect.left) / rect.width) * VOLUME_CELLS);
    setVolume(Math.max(1, Math.min(cell, VOLUME_CELLS)) / VOLUME_CELLS);
  }

  return (
    <span className="t-volume">
      <button
        type="button"
        tabIndex={-1}
        className="t-volume-label"
        onClick={toggleMute}
        title="mute (m)"
        aria-label={isMuted ? 'Unmute' : `Mute. Volume ${Math.round(volume * 100)}%`}
      >
        vol
      </button>
      <span
        className="t-volume-cells"
        role="slider"
        aria-label="Volume"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(level * 100)}
        title="volume (+ -)"
        onClick={handleCellsClick}
      >
        {Array.from({ length: VOLUME_CELLS }, (_, index) => (
          <i key={index} className={index < filled ? 'is-on' : undefined} style={{ height: `${36 + (index / (VOLUME_CELLS - 1)) * 64}%` }} />
        ))}
      </span>
      <span className="t-volume-pct">{isMuted ? 'mute' : `${Math.round(volume * 100)}%`}</span>
    </span>
  );
}

function Progress({ fallbackDuration }: { fallbackDuration: number }) {
  const currentTime = useStore(s => s.currentTime);
  const storedDuration = useStore(s => s.duration);
  const seekTo = useStore(s => s.seekTo);
  const duration = Number.isFinite(storedDuration) && storedDuration > 0 ? storedDuration : fallbackDuration;
  return (
    <div className="t-player-progress">
      <span className="t-player-time">{time(currentTime)}</span>
      <ProgressBar
        value={currentTime}
        max={duration}
        label="Seek"
        valueText={`${time(currentTime)} of ${time(duration)}`}
        formatTip={time}
        onSeek={seekTo}
      />
      <span className="t-player-time">{time(duration)}</span>
    </div>
  );
}

export function PlayerLine() {
  const track = useStore(s => s.currentTrack);
  const isPlaying = useStore(s => s.isPlaying);
  const shuffle = useStore(s => s.shuffle);
  const repeat = useStore(s => s.repeat);
  const queueIndex = useStore(s => s.queueIndex);
  const queueLength = useStore(s => s.queue.length);
  const togglePlay = useStore(s => s.togglePlay);
  const next = useStore(s => s.next);
  const prev = useStore(s => s.prev);
  const toggleShuffle = useStore(s => s.toggleShuffle);
  const cycleRepeat = useStore(s => s.cycleRepeat);
  const ambient = useRef<HTMLDivElement>(null);

  const format = track && [track.suffix, track.bitRate ? `${track.bitRate} kbps` : ''].filter(Boolean).join(' ');
  const position = track && queueLength > 0 ? `${queueIndex + 1}/${queueLength}` : '';
  const meta = [format, position].filter(Boolean).join(' · ');

  return (
    <>
      {/* A sibling of the pane, so its animations can't change what the fixed position is relative to. */}
      <div ref={ambient} className="t-ambient" aria-hidden="true" />
      <Pane title={track ? (isPlaying ? 'now playing' : 'paused') : 'stopped'} meta={meta} className={`t-player${isPlaying ? ' is-playing' : ''}`}>
        <Spectrum
          className="t-player-spectrum"
          cell={SPECTRUM_CELL}
          onLevel={level => {
            if (ambient.current) ambient.current.style.opacity = String(AMBIENT_BASE + level * AMBIENT_RANGE);
          }}
        />
        <div className="t-player-main">
          <span className="t-player-transport">
            <button type="button" tabIndex={-1} className="t-player-skip" onClick={prev} disabled={!track} title="previous (p)" aria-label="Previous track"><PrevIcon /></button>
            <button
              type="button"
              tabIndex={-1}
              className="t-player-toggle"
              onClick={togglePlay}
              disabled={!track}
              title={`${isPlaying ? 'pause' : 'play'} (space)`}
              aria-label={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? <PauseIcon /> : <PlayIcon />}
            </button>
            <button type="button" tabIndex={-1} className="t-player-skip" onClick={next} disabled={!track} title="next (n)" aria-label="Next track"><NextIcon /></button>
          </span>
          {track ? (
            <div className="t-player-track" key={track.id}>
              <div className="t-player-headline">
                <span className="t-player-title" title={track.title}>{track.title}</span>
                <button
                  type="button"
                  tabIndex={-1}
                  className={`t-player-star${track.starred ? ' is-on' : ''}`}
                  onClick={starCurrent}
                  title="star (F)"
                  aria-label={track.starred ? `Unstar ${track.title}` : `Star ${track.title}`}
                  aria-pressed={!!track.starred}
                >
                  <StarIcon filled={!!track.starred} />
                </button>
              </div>
              {/* Spans, because a button couldn't be cut short by the track's ellipsis. */}
              <div className="t-player-by">
                <span className="t-player-link" role="link" aria-label={`Go to artist ${track.artist}`} onClick={() => openArtistOf(track)}>{track.artist}</span>
                <span className="t-sep"> · </span>
                <span className="t-player-link" role="link" aria-label={`Go to album ${track.album}`} onClick={() => openAlbumOf(track)}>{track.album}</span>
              </div>
            </div>
          ) : (
            <div className="t-player-track">
              <div className="t-player-headline"><span className="t-player-idle">nothing playing</span></div>
              <div className="t-player-by">press <kbd>enter</kbd> on anything to play it</div>
            </div>
          )}
          <span className="t-player-controls">
            <button type="button" tabIndex={-1} className={`t-flag${shuffle ? ' is-on' : ''}`} onClick={toggleShuffle} title="shuffle (s)" aria-pressed={shuffle}>
              <i className="t-led" />shuffle
            </button>
            <button type="button" tabIndex={-1} className={`t-flag${repeat !== 'none' ? ' is-on' : ''}`} onClick={cycleRepeat} title="repeat (r)">
              <i className="t-led" />{REPEAT_LABELS[repeat]}
            </button>
            <Volume />
          </span>
        </div>
        <Progress fallbackDuration={track?.duration ?? 0} />
      </Pane>
    </>
  );
}
