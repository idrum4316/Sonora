import { useEffect, useRef, useState } from 'react';
import { useStore } from '../../core/store';
import { coverUrl } from '../art';
import { paletteStyle, useIdle, useNowPalette } from '../hooks';
import { albumPath, artistPath, back, go } from '../router';
import { useUi } from '../ui';
import { Cover } from '../widgets/Cover';
import { CloseIcon, CollapseIcon, ExpandIcon, GridIcon, QueueIcon, SparkIcon } from '../widgets/Icons';
import { PixelCover } from '../widgets/PixelCover';
import { PixelField } from '../widgets/pixelField';
import { PlaylistButton, Progress, StarButton, Transport, Volume } from '../widgets/Player';

const FIELD_KEY = 'sonora-gallery-field';

function savedField(): boolean {
  try { return localStorage.getItem(FIELD_KEY) !== 'off'; } catch { return true; }
}

/**
 * The now-playing stage: the cover, sharp, in the middle of a wall of lights made from the same cover,
 * playing the music. The controls get out of the way when the pointer rests.
 */
export function Stage() {
  const track = useStore(s => s.currentTrack);
  const isPlaying = useStore(s => s.isPlaying);
  const queue = useStore(s => s.queue);
  const queueIndex = useStore(s => s.queueIndex);
  const playTrack = useStore(s => s.playTrack);
  const palette = useNowPalette();
  const { queueOpen, setQueueOpen } = useUi();
  const idle = useIdle(3200, !!track && !queueOpen);
  const [field, setField] = useState(savedField);
  const [fullscreen, setFullscreen] = useState(!!document.fullscreenElement);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fieldRef = useRef<PixelField | null>(null);
  const hasTrack = !!track;

  useEffect(() => {
    if (!field || !canvasRef.current) return;
    const f = new PixelField(canvasRef.current, { focus: () => document.querySelector('.g-stage-art') });
    fieldRef.current = f;
    return () => { f.dispose(); fieldRef.current = null; };
  }, [field, hasTrack]);

  useEffect(() => {
    fieldRef.current?.setArt(track?.coverArt ? coverUrl(track.coverArt, 400) : null);
  }, [track?.coverArt, field, hasTrack]);

  useEffect(() => { fieldRef.current?.setPlaying(isPlaying); }, [isPlaying, field, hasTrack]);

  useEffect(() => {
    document.title = track ? `${track.title} · ${track.artist}` : 'Sonora Gallery';
  }, [track]);

  useEffect(() => {
    const onChange = () => setFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || (e.target as HTMLElement).closest('input, [role="slider"]')) return;
      const { seekTo, currentTime, duration } = useStore.getState();
      if (e.key === 'ArrowRight') { e.preventDefault(); seekTo(Math.min(duration || 0, currentTime + 10)); }
      if (e.key === 'ArrowLeft') { e.preventDefault(); seekTo(Math.max(0, currentTime - 10)); }
      if (e.key === 'v') toggleField();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const toggleField = () => {
    const next = !field;
    setField(next);
    try { localStorage.setItem(FIELD_KEY, next ? 'on' : 'off'); } catch { /* not remembered */ }
  };

  const toggleFullscreen = () => {
    if (document.fullscreenElement) void document.exitFullscreen();
    else void document.documentElement.requestFullscreen?.().catch(() => {});
  };

  const upNext = queue.slice(queueIndex + 1, queueIndex + 4);

  if (!track) {
    return (
      <div className="g-stage is-empty">
        <div className="g-stage-empty">
          <span className="g-eyebrow">Stage</span>
          <h1 className="g-display">Nothing playing</h1>
          <p className="g-lede">Pick an album on the atlas and the stage lights up with it.</p>
          <button className="g-pill is-accent is-big" onClick={() => go('/')}><GridIcon size={18} /> To the atlas</button>
        </div>
      </div>
    );
  }

  return (
    <div className={`g-stage${idle ? ' is-idle' : ''}${field ? '' : ' no-field'}`} style={paletteStyle(palette)}>
      <div className="g-stage-glow" style={track.coverArt ? { backgroundImage: `url("${coverUrl(track.coverArt, 400)}")` } : undefined} aria-hidden="true" />
      {field && <canvas ref={canvasRef} className="g-stage-field" aria-hidden="true" />}
      <div className="g-stage-vignette" aria-hidden="true" />

      <header className="g-stage-top g-fades">
        <button className="g-icon-btn is-ring" onClick={back} title="Leave the stage (esc)"><CloseIcon size={20} /></button>
        <span className="g-eyebrow">
          Playing from <button className="g-link" onClick={() => go(albumPath(track.albumId))}>{track.album}</button>
        </span>
        <div className="g-stage-tools">
          <button className={`g-icon-btn${field ? ' is-on' : ''}`} onClick={toggleField} title="Light wall (v)" aria-pressed={field}><SparkIcon size={19} /></button>
          <button className="g-icon-btn" onClick={toggleFullscreen} title="Full screen">{fullscreen ? <CollapseIcon size={18} /> : <ExpandIcon size={18} />}</button>
          <button className={`g-icon-btn${queueOpen ? ' is-on' : ''}`} onClick={() => setQueueOpen(!queueOpen)} title="Queue (q)"><QueueIcon size={19} /></button>
        </div>
      </header>

      <main className="g-stage-center">
        <div className="g-stage-art">
          <PixelCover coverArt={track.coverArt} className="g-stage-cover" />
        </div>
        <div className="g-stage-meta">
          <h1 className="g-stage-title" key={track.id}>{track.title}</h1>
          <p className="g-stage-sub">
            <button className="g-link" onClick={() => track.artistId && go(artistPath(track.artistId))}>{track.artist}</button>
            <span className="g-dim"> · </span>
            <button className="g-link g-dim" onClick={() => go(albumPath(track.albumId))}>{track.album}</button>
            {track.year ? <span className="g-mono g-dim"> · {track.year}</span> : null}
          </p>
          <div className="g-fades">
            <Progress className="is-stage" />
            <div className="g-stage-controls">
              <span className="g-stage-marks">
                <StarButton size={20} />
                <PlaylistButton size={20} />
              </span>
              <Transport size="lg" />
              <Volume />
            </div>
          </div>
        </div>
      </main>

      {upNext.length > 0 && (
        <aside className="g-stage-next g-fades">
          <span className="g-eyebrow">Up next</span>
          {upNext.map((song, k) => (
            <button key={`${song.id}-${k}`} className="g-stage-next-item" onClick={() => playTrack(song, queue, queueIndex + 1 + k)}>
              <Cover coverArt={song.coverArt} size={96} />
              <span>
                <span className="g-stage-next-title">{song.title}</span>
                <span className="g-stage-next-artist">{song.artist}</span>
              </span>
            </button>
          ))}
        </aside>
      )}
    </div>
  );
}
