import { useEffect, useRef } from 'react';
import { currentArtColors, gradientAt, useArtPalette } from '../../core/artPalette';
import { useStore } from '../../core/store';
import { readDecorative, readLevels } from '../../core/audioTap';
import { reducedMotion } from '../motion';
import { CELL_WIDTH, ROW_HEIGHT } from '../nav';

/** A bar's width and the gap after it, in character cells. */
export interface BarSize {
  width: number;
  gap: number;
}

interface SpectrumProps {
  className?: string;
  bars: BarSize;
  /** Plays the decorative pattern whatever the audio is doing, for screens with no player. */
  demo?: boolean;
}

/** More than this looks no smoother in steps this coarse, and music plays for hours. */
const FRAME_MS = 1000 / 30;
const ATTACK_MS = 45;
const RELEASE_MS = 210;
/** A cell's height divides into eighths, as the block characters ▁▂▃▄▅▆▇█ divide it. */
const STEPS_PER_ROW = 8;
/** How strongly the resting line shows, so an idle display doesn't look like an empty box. */
const IDLE_ALPHA = 0.35;

/**
 * Draws bars of block characters on the character grid, the way cava and btop do. They're painted on a
 * canvas rather than typed, because the web font has no block characters and fallback fonts leave
 * seams. Mirrored, so the low end sits in the middle.
 *
 * With the album accent, each bar takes a color from a gradient through the cover art's colors, running
 * from the middle outward. A bar is one color from top to bottom, as a terminal colors a column of cells.
 */
function runSpectrum(canvas: HTMLCanvasElement, bars: BarSize, demo: boolean) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return () => {};

  const pitch = (bars.width + bars.gap) * CELL_WIDTH;
  const barWidth = bars.width * CELL_WIDTH;
  const stepHeight = ROW_HEIGHT / STEPS_PER_ROW;
  let dpr = 1;
  let cols = 0;
  let steps = 0;
  let offsetX = 0;
  let accent = '#fff';
  /** A color per bar, or null when every bar is the accent. */
  let barColors: string[] | null = null;
  let stops: string[] | null = null;
  let levels = new Float32Array(0);
  let targets = new Float32Array(0);
  let frameId = 0;
  let lastFrame = 0;

  /** Positions land on whole device pixels, so every bar is the same crisp size. */
  const snap = (value: number) => Math.round(value * dpr);
  const bandOf = (col: number) => Math.floor(Math.abs(col - (cols - 1) / 2));

  function readColors() {
    accent = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || accent;
    stops = (useStore.getState().accentColor === 'album' && currentArtColors()?.stops) || null;
    paintBars();
  }

  function paintBars() {
    const bands = Math.ceil(cols / 2);
    barColors = stops && cols
      ? Array.from({ length: cols }, (_, col) => gradientAt(stops!, bands > 1 ? bandOf(col) / (bands - 1) : 0))
      : null;
  }

  function resize() {
    const rect = canvas.getBoundingClientRect();
    dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(rect.width * dpr);
    canvas.height = Math.round(rect.height * dpr);
    cols = Math.floor((rect.width + bars.gap * CELL_WIDTH) / pitch);
    steps = Math.floor(rect.height / ROW_HEIGHT) * STEPS_PER_ROW;
    offsetX = (rect.width + bars.gap * CELL_WIDTH - cols * pitch) / 2;
    const bands = Math.ceil(cols / 2);
    levels = new Float32Array(bands);
    targets = new Float32Array(bands);
    paintBars();
    render();
    wake();
  }

  function render() {
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = accent;
    for (let col = 0; col < cols; col++) {
      const lit = Math.round(levels[bandOf(col)] * steps);
      const height = snap(Math.max(lit, 1) * stepHeight);
      ctx.globalAlpha = lit ? 1 : IDLE_ALPHA;
      if (barColors) ctx.fillStyle = barColors[col];
      ctx.fillRect(snap(offsetX + col * pitch), canvas.height - height, snap(barWidth), height);
    }
  }

  function frame(now: number) {
    frameId = 0;
    const running = demo || useStore.getState().isPlaying;
    const elapsed = now - lastFrame;
    if (lastFrame && elapsed < FRAME_MS - 1) {
      frameId = requestAnimationFrame(frame);
      return;
    }
    const dt = Math.min(100, lastFrame ? elapsed : FRAME_MS);
    lastFrame = now;
    if (running) {
      if (demo) readDecorative(targets, now);
      else readLevels(targets, now);
    } else {
      targets.fill(0);
    }

    const attack = 1 - Math.exp(-dt / ATTACK_MS);
    const release = 1 - Math.exp(-dt / RELEASE_MS);
    let moving = false;
    for (let band = 0; band < levels.length; band++) {
      const target = targets[band];
      levels[band] += (target - levels[band]) * (target > levels[band] ? attack : release);
      if (levels[band] > 0.003) moving = true;
    }
    render();
    // With nothing to show, stop until playback or the size changes.
    if ((running || moving) && cols && steps) frameId = requestAnimationFrame(frame);
    else lastFrame = 0;
  }

  function wake() {
    if (!frameId && cols && steps && !reducedMotion()) frameId = requestAnimationFrame(frame);
  }

  readColors();
  resize();
  const observer = new ResizeObserver(resize);
  observer.observe(canvas);
  const unsubscribe = useStore.subscribe((s, prev) => {
    if (s.isPlaying !== prev.isPlaying) wake();
    if (s.theme === prev.theme && s.accentColor === prev.accentColor) return;
    readColors();
    render();
  });
  const unsubscribePalette = useArtPalette.subscribe(() => {
    readColors();
    render();
  });

  return () => {
    cancelAnimationFrame(frameId);
    frameId = 0;
    observer.disconnect();
    unsubscribe();
    unsubscribePalette();
  };
}

export function Spectrum({ className, bars, demo = false }: SpectrumProps) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const { width, gap } = bars;

  useEffect(() => {
    if (!canvas.current) return;
    return runSpectrum(canvas.current, { width, gap }, demo);
  }, [width, gap, demo]);

  return (
    <div className={`t-spectrum${className ? ` ${className}` : ''}`} aria-hidden="true">
      <canvas ref={canvas} />
    </div>
  );
}
