import { type PointerEvent } from 'react';
import { fmt } from '../../core/format';
import { useStore } from '../../core/store';
import { starCurrent } from '../commands';
import { openAlbumOf, openArtistOf } from '../nav';
import { Pane } from './Pane';
import { ProgressBar } from './ProgressBar';
import { Spectrum, type BarSize } from './Spectrum';

const VOLUME_CELLS = 10;
const SPECTRUM_BARS: BarSize = { width: 1, gap: 1 };

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

  /** Only dragging past the left edge reaches zero, so a press always lands on a cell. */
  function volumeAt(e: PointerEvent<HTMLSpanElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    if (x < 0) return 0;
    return Math.max(1, Math.min(Math.ceil((x / rect.width) * VOLUME_CELLS), VOLUME_CELLS)) / VOLUME_CELLS;
  }

  function handlePointerDown(e: PointerEvent<HTMLSpanElement>) {
    if (e.button !== 0) return;
    // Keeps the moves coming when the pointer leaves the bar, and ends by itself on release.
    e.currentTarget.setPointerCapture(e.pointerId);
    setVolume(volumeAt(e));
  }

  function handlePointerMove(e: PointerEvent<HTMLSpanElement>) {
    if (!e.currentTarget.hasPointerCapture(e.pointerId)) return;
    const next = volumeAt(e);
    if (next !== level) setVolume(next);
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
      <span>
        <span aria-hidden="true">[</span>
        <span
          className="t-volume-cells"
          role="slider"
          // Being focusable tells touch browsers it's a control, so they don't move a tap to a neighbor.
          tabIndex={-1}
          aria-label="Volume"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(level * 100)}
          title="volume (+ -)"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
        >
          <span className="is-on">{'#'.repeat(filled)}</span>{'-'.repeat(VOLUME_CELLS - filled)}
        </span>
        <span aria-hidden="true">]</span>
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
    <>
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
    </>
  );
}

/** A checkbox, the way a TUI draws one. */
const FlagMark = ({ on }: { on: boolean }) => <span className="t-flag-mark" aria-hidden="true">{on ? '[x]' : '[ ]'} </span>;

function Transport({ hasTrack }: { hasTrack: boolean }) {
  const isPlaying = useStore(s => s.isPlaying);
  const togglePlay = useStore(s => s.togglePlay);
  const next = useStore(s => s.next);
  const prev = useStore(s => s.prev);
  return (
    <span className="t-player-transport">
      <button type="button" tabIndex={-1} className="t-player-skip" onClick={prev} disabled={!hasTrack} title="previous (p)" aria-label="Previous track">{'[|<]'}</button>
      <button
        type="button"
        tabIndex={-1}
        className="t-player-toggle"
        onClick={togglePlay}
        disabled={!hasTrack}
        title={`${isPlaying ? 'pause' : 'play'} (space)`}
        aria-label={isPlaying ? 'Pause' : 'Play'}
      >
        {isPlaying ? '[||]' : '[|>]'}
      </button>
      <button type="button" tabIndex={-1} className="t-player-skip" onClick={next} disabled={!hasTrack} title="next (n)" aria-label="Next track">{'[>|]'}</button>
    </span>
  );
}

export function PlayerLine() {
  const track = useStore(s => s.currentTrack);
  const isPlaying = useStore(s => s.isPlaying);
  const shuffle = useStore(s => s.shuffle);
  const repeat = useStore(s => s.repeat);
  const queueIndex = useStore(s => s.queueIndex);
  const queueLength = useStore(s => s.queue.length);
  const toggleShuffle = useStore(s => s.toggleShuffle);
  const cycleRepeat = useStore(s => s.cycleRepeat);

  const format = track && [track.suffix, track.bitRate ? `${track.bitRate} kbps` : ''].filter(Boolean).join(' ');
  const position = track && queueLength > 0 ? `${queueIndex + 1}/${queueLength}` : '';
  const meta = [format, position].filter(Boolean).join(' · ');

  return (
    <Pane title={track ? (isPlaying ? 'now playing' : 'paused') : 'stopped'} meta={meta} className="t-player">
      <div className="t-player-main">
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
                {track.starred ? '[*]' : '[ ]'}
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
        <Spectrum className="t-player-spectrum" bars={SPECTRUM_BARS} />
        <div className="t-player-controls">
          <span className="t-player-flags">
            <button type="button" tabIndex={-1} className={`t-flag${shuffle ? ' is-on' : ''}`} onClick={toggleShuffle} title="shuffle (s)" aria-pressed={shuffle}>
              <FlagMark on={shuffle} />shuffle
            </button>
            <button type="button" tabIndex={-1} className={`t-flag${repeat !== 'none' ? ' is-on' : ''}`} onClick={cycleRepeat} title="repeat (r)">
              <FlagMark on={repeat !== 'none'} />{REPEAT_LABELS[repeat]}
            </button>
          </span>
          <Volume />
        </div>
      </div>
      <div className="t-player-progress">
        <Transport hasTrack={!!track} />
        <Progress fallbackDuration={track?.duration ?? 0} />
      </div>
    </Pane>
  );
}
