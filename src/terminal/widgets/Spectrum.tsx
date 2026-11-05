import { useEffect, useRef } from 'react';
import { useStore } from '../../core/store';
import { readDecorative, readLevels } from '../audioTap';
import { reducedMotion } from '../motion';

/** The size of one lit cell and the gap around it, in CSS pixels. */
export interface CellSize {
  width: number;
  height: number;
  gapX: number;
  gapY: number;
}

interface SpectrumProps {
  className?: string;
  cell: CellSize;
  /** Plays the decorative pattern whatever the audio is doing, for screens with no player. */
  demo?: boolean;
  /** Called each frame with how loud the low end is, 0–1. */
  onLevel?: (level: number) => void;
}

/** Cells move in whole steps, so more than this looks no smoother, and music plays for hours. */
const FRAME_MS = 1000 / 30;
const ATTACK_MS = 45;
const RELEASE_MS = 210;
const PEAK_HOLD_MS = 380;
const PEAK_FALL_PER_MS = 0.00042;
/** The glow's canvas has one pixel for about this many cells' width. The browser softens it as it scales up. */
const BLOOM_CELLS_PER_PIXEL = 1.5;

interface Layers {
  /** The unlit cells. Painted once per size and color. */
  ghost: HTMLCanvasElement;
  /** The soft light around the lit cells, at a very low resolution that CSS stretches to fit. */
  bloom: HTMLCanvasElement;
  /** The lit cells, at full resolution. */
  cells: HTMLCanvasElement;
}

/**
 * Draws a dot-matrix spectrum, like the display on a hi-fi: unlit cells stay faintly visible behind
 * the lit ones, and each band's peak lingers. Mirrored, so the low end sits in the middle and the
 * quiet highs fall away toward the text at either side.
 *
 * It's three stacked canvases so each frame only redraws what changed. The browser composites them,
 * which keeps the display cheap enough to leave running.
 */
function runSpectrum({ ghost, bloom, cells }: Layers, cell: CellSize, demo: boolean, report: () => SpectrumProps['onLevel']) {
  const ghost2d = ghost.getContext('2d');
  const bloom2d = bloom.getContext('2d');
  const cells2d = cells.getContext('2d');
  if (!ghost2d || !bloom2d || !cells2d) return () => {};

  const pitchX = cell.width + cell.gapX;
  const pitchY = cell.height + cell.gapY;
  let dpr = 1;
  let cols = 0;
  let rows = 0;
  let offsetX = 0;
  let accent = '#fff';
  let levels = new Float32Array(0);
  let targets = new Float32Array(0);
  let peaks = new Float32Array(0);
  let peakAges = new Float32Array(0);
  let frameId = 0;
  let lastFrame = 0;

  /** Cell positions land on whole device pixels, so every cell is the same crisp size. */
  const snap = (value: number) => Math.round(value * dpr);
  const bandOf = (col: number) => Math.floor(Math.abs(col - (cols - 1) / 2));

  function paintGhost() {
    if (!ghost2d) return;
    const root = document.documentElement;
    ghost2d.clearRect(0, 0, ghost.width, ghost.height);
    ghost2d.fillStyle = getComputedStyle(root).getPropertyValue('--text-primary').trim() || '#fff';
    ghost2d.globalAlpha = root.dataset.theme === 'light' ? 0.055 : 0.045;
    for (let col = 0; col < cols; col++) {
      for (let row = 0; row < rows; row++) {
        ghost2d.fillRect(snap(offsetX + col * pitchX), snap(row * pitchY), snap(cell.width), snap(cell.height));
      }
    }
  }

  function readColors() {
    accent = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || accent;
    paintGhost();
  }

  function resize() {
    const rect = cells.getBoundingClientRect();
    dpr = window.devicePixelRatio || 1;
    ghost.width = cells.width = Math.round(rect.width * dpr);
    ghost.height = cells.height = Math.round(rect.height * dpr);
    cols = Math.floor((rect.width + cell.gapX) / pitchX);
    rows = Math.floor((rect.height + cell.gapY) / pitchY);
    bloom.width = Math.max(1, Math.round(cols / BLOOM_CELLS_PER_PIXEL));
    bloom.height = Math.max(1, Math.round(rows / BLOOM_CELLS_PER_PIXEL));
    offsetX = (rect.width + cell.gapX - cols * pitchX) / 2;
    const bands = Math.ceil(cols / 2);
    levels = new Float32Array(bands);
    targets = new Float32Array(bands);
    peaks = new Float32Array(bands);
    peakAges = new Float32Array(bands);
    paintGhost();
    render();
    wake();
  }

  function renderBloom() {
    if (!bloom2d) return;
    const { width, height } = bloom;
    bloom2d.clearRect(0, 0, width, height);
    bloom2d.fillStyle = accent;
    for (let x = 0; x < width; x++) {
      const level = levels[bandOf(Math.floor(((x + 0.5) / width) * cols))] ?? 0;
      const lit = level * height;
      if (lit > 0.02) bloom2d.fillRect(x, height - lit, 1, lit);
    }
  }

  function render() {
    if (!cells2d) return;
    cells2d.globalAlpha = 1;
    cells2d.clearRect(0, 0, cells.width, cells.height);
    if (!cols || !rows) return;

    const cellW = snap(cell.width);
    const cellH = snap(cell.height);
    cells2d.fillStyle = accent;
    for (let row = 0; row < rows; row++) {
      // Dimmer at the base and brightest at the top, so loud moments read as light, not just height.
      cells2d.globalAlpha = 0.46 + 0.54 * (row / Math.max(1, rows - 1));
      const y = snap((rows - 1 - row) * pitchY);
      for (let col = 0; col < cols; col++) {
        if (levels[bandOf(col)] * rows > row + 0.35) cells2d.fillRect(snap(offsetX + col * pitchX), y, cellW, cellH);
      }
    }
    cells2d.globalAlpha = 0.95;
    for (let col = 0; col < cols; col++) {
      const peakRow = Math.floor(peaks[bandOf(col)] * rows);
      if (peakRow >= 1 && peakRow < rows) {
        cells2d.fillRect(snap(offsetX + col * pitchX), snap((rows - 1 - peakRow) * pitchY), cellW, cellH);
      }
    }
    renderBloom();
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
    let low = 0;
    const lowBands = Math.max(1, Math.floor(levels.length / 5));
    for (let band = 0; band < levels.length; band++) {
      const target = targets[band];
      levels[band] += (target - levels[band]) * (target > levels[band] ? attack : release);
      if (band < lowBands) low += levels[band];

      if (levels[band] >= peaks[band]) {
        peaks[band] = levels[band];
        peakAges[band] = 0;
      } else {
        peakAges[band] += dt;
        if (peakAges[band] > PEAK_HOLD_MS) peaks[band] = Math.max(0, peaks[band] - PEAK_FALL_PER_MS * dt);
      }
      if (levels[band] > 0.003 || peaks[band] > 0.003) moving = true;
    }
    render();
    report()?.(low / lowBands);
    // With nothing to show, stop until playback or the size changes.
    if ((running || moving) && cols && rows) frameId = requestAnimationFrame(frame);
    else lastFrame = 0;
  }

  function wake() {
    if (!frameId && cols && rows && !reducedMotion()) frameId = requestAnimationFrame(frame);
  }

  readColors();
  resize();
  const observer = new ResizeObserver(resize);
  observer.observe(cells);
  const unsubscribe = useStore.subscribe((s, prev) => {
    if (s.isPlaying !== prev.isPlaying) wake();
    if (s.theme === prev.theme && s.accentColor === prev.accentColor) return;
    readColors();
    render();
  });

  return () => {
    cancelAnimationFrame(frameId);
    frameId = 0;
    observer.disconnect();
    unsubscribe();
  };
}

export function Spectrum({ className, cell, demo = false, onLevel }: SpectrumProps) {
  const ghost = useRef<HTMLCanvasElement>(null);
  const bloom = useRef<HTMLCanvasElement>(null);
  const cells = useRef<HTMLCanvasElement>(null);
  const latestOnLevel = useRef(onLevel);
  latestOnLevel.current = onLevel;
  const { width, height, gapX, gapY } = cell;

  useEffect(() => {
    if (!ghost.current || !bloom.current || !cells.current) return;
    return runSpectrum(
      { ghost: ghost.current, bloom: bloom.current, cells: cells.current },
      { width, height, gapX, gapY },
      demo,
      () => latestOnLevel.current,
    );
  }, [width, height, gapX, gapY, demo]);

  return (
    <div className={`t-spectrum${className ? ` ${className}` : ''}`} aria-hidden="true">
      <canvas ref={ghost} />
      <canvas ref={bloom} className="t-spectrum-bloom" />
      <canvas ref={cells} />
    </div>
  );
}
