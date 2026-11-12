import { readDecorative, readLevels } from '../../core/audioTap';
import { reducedMotion } from '../motion';
import { isLight, onThemeChange } from '../theme';

/**
 * The cover art blown up into a wall of square lights that play the music.
 *
 * The art is shrunk to one pixel per cell, and each cell's light grows and brightens with one band of the
 * spectrum: bass right around the cover, treble at the edges of the screen, so a kick drum pulses outward
 * from the art in square rings. A new cover washes in as a wave from the middle. Nothing here reads pixels back, so it works
 * whether or not the server allows CORS.
 */

export interface PixelFieldOptions {
  /** Paints drifting color instead of art, with made-up levels, for screens with nothing playing. */
  demo?: boolean;
  /** Cell size in CSS pixels. Defaults to a size that fits the screen. */
  cell?: number;
  /**
   * The element the music radiates from, such as the cover. Rings then start at its edges and grow
   * outward as squares around it. Without one, they're circles around the middle.
   */
  focus?: () => Element | null;
}

const BANDS = 40;
const ATTACK_MS = 40;
const RELEASE_MS = 260;
const WAVE_MS = 1500;
/** How lit a cell is when nothing plays: the art as a calm mosaic. */
const REST = 0.42;

export class PixelField {
  private ctx: CanvasRenderingContext2D;
  private dpr = 1;
  private w = 0;
  private h = 0;
  private cell = 24;
  private cols = 0;
  private rows = 0;
  /** One pixel per cell: the art now, and the art it's washing over. */
  private src = document.createElement('canvas');
  private prev = document.createElement('canvas');
  private art: HTMLImageElement | null = null;
  private waveStart = -Infinity;
  private bandOf = new Uint8Array(0);
  private dist = new Float32Array(0);
  private jitter = new Float32Array(0);
  private raw = new Float32Array(BANDS);
  private levels = new Float32Array(BANDS).fill(REST);
  private playing = false;
  private frame = 0;
  private last = 0;
  private resizeObserver: ResizeObserver;
  private stopThemeSync: () => void;
  private demoHue = Math.random() * 360;
  private disposed = false;
  private wantedArt = '';

  constructor(private canvas: HTMLCanvasElement, private opts: PixelFieldOptions = {}) {
    this.ctx = canvas.getContext('2d')!;
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(canvas);
    this.resize();
    // A still wall has stopped drawing, so repaint it in the new theme.
    this.stopThemeSync = onThemeChange(() => this.wake());
    if (opts.demo) this.setPlaying(true);
  }

  dispose() {
    this.disposed = true;
    cancelAnimationFrame(this.frame);
    this.resizeObserver.disconnect();
    this.stopThemeSync();
  }

  setArt(url: string | null) {
    if (!url) return;
    this.wantedArt = url;
    const img = new Image();
    img.decoding = 'async';
    img.onload = () => {
      // Only the latest cover, and only while the wall is still up.
      if (this.disposed || url !== this.wantedArt || this.art?.src === img.src) return;
      this.art = img;
      // Keep the old art to wash over.
      const p = this.prev.getContext('2d')!;
      p.clearRect(0, 0, this.prev.width, this.prev.height);
      p.drawImage(this.src, 0, 0);
      this.paintArt();
      this.waveStart = reducedMotion() ? -Infinity : performance.now();
      this.wake();
    };
    img.src = url;
  }

  setPlaying(playing: boolean) {
    this.playing = playing;
    this.wake();
  }

  private resize() {
    const rect = this.canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    this.dpr = Math.min(2, window.devicePixelRatio || 1);
    this.w = rect.width;
    this.h = rect.height;
    this.canvas.width = Math.round(rect.width * this.dpr);
    this.canvas.height = Math.round(rect.height * this.dpr);
    this.cell = this.opts.cell ?? Math.max(14, Math.min(34, Math.round(Math.min(this.w, this.h) / 30)));
    this.cols = Math.ceil(this.w / this.cell) + 1;
    this.rows = Math.ceil(this.h / this.cell) + 1;
    for (const c of [this.src, this.prev]) {
      c.width = this.cols;
      c.height = this.rows;
    }

    const n = this.cols * this.rows;
    this.bandOf = new Uint8Array(n);
    this.dist = new Float32Array(n);
    this.jitter = new Float32Array(n);
    const target = this.opts.focus?.()?.getBoundingClientRect();
    const box = target && target.width
      ? { x: target.left + target.width / 2 - rect.left, y: target.top + target.height / 2 - rect.top, hw: target.width / 2, hh: target.height / 2 }
      : null;
    const cx = box?.x ?? this.w / 2, cy = box?.y ?? this.h / 2;
    const reach = box
      ? Math.max(cx - box.hw, this.w - cx - box.hw, cy - box.hh, this.h - cy - box.hh, 1)
      : Math.hypot(cx, cy);
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        const i = r * this.cols + c;
        const px = (c + 0.5) * this.cell - cx, py = (r + 0.5) * this.cell - cy;
        const d = box
          ? Math.max(0, Math.abs(px) - box.hw, Math.abs(py) - box.hh) / reach
          : Math.hypot(px, py) / reach;
        this.dist[i] = d;
        this.jitter[i] = Math.random();
        // A little scatter across the band edges, so the rings don't look drawn with a compass.
        const band = Math.floor(Math.min(1, d) ** 0.8 * BANDS + (Math.random() - 0.5) * 2.2);
        this.bandOf[i] = Math.max(0, Math.min(BANDS - 1, band));
      }
    }
    if (this.art) this.paintArt();
    this.wake();
  }

  /** Shrinks the art to one pixel per cell, cropped to fill the screen like a backdrop. */
  private paintArt() {
    const ctx = this.src.getContext('2d')!;
    const img = this.art;
    if (!img) return;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    const scale = Math.max(this.cols / img.naturalWidth, this.rows / img.naturalHeight);
    const dw = img.naturalWidth * scale, dh = img.naturalHeight * scale;
    ctx.clearRect(0, 0, this.cols, this.rows);
    ctx.drawImage(img, (this.cols - dw) / 2, (this.rows - dh) / 2, dw, dh);
  }

  /**
   * Slow-moving fields of color, for the demo. On the dark ground they add up like colored light; on the
   * light one they multiply like inks, so paper shows where none fall.
   */
  private paintDemo(now: number) {
    const ctx = this.src.getContext('2d')!;
    const t = now / 1000;
    const { cols, rows } = this;
    const light = isLight();
    ctx.fillStyle = light ? '#f3f1ec' : '#07070b';
    ctx.fillRect(0, 0, cols, rows);
    ctx.globalCompositeOperation = light ? 'multiply' : 'lighter';
    for (let k = 0; k < 4; k++) {
      const hue = (this.demoHue + k * 70 + t * 6) % 360;
      const x = cols * (0.5 + 0.42 * Math.sin(t * (0.07 + k * 0.023) + k * 2.1));
      const y = rows * (0.5 + 0.4 * Math.cos(t * (0.05 + k * 0.019) + k * 1.3));
      const r = Math.max(cols, rows) * (0.42 + 0.1 * Math.sin(t * 0.2 + k));
      const g = ctx.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, light ? `hsla(${hue}, 80%, 66%, 0.85)` : `hsla(${hue}, 85%, 58%, 0.9)`);
      g.addColorStop(1, `hsla(${hue}, 85%, ${light ? 66 : 50}%, 0)`);
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, cols, rows);
    }
    ctx.globalCompositeOperation = 'source-over';
  }

  private wake() {
    if (this.frame || this.disposed) return;
    this.frame = requestAnimationFrame(t => this.draw(t));
  }

  private draw(now: number) {
    this.frame = 0;
    if (!this.w) return;
    const still = reducedMotion();
    const dt = this.last ? Math.min(64, now - this.last) : 16;
    this.last = now;

    // Levels: live music, the demo pattern, or settling back to rest.
    let settling = false;
    if (this.playing && !still) {
      if (this.opts.demo) readDecorative(this.raw, now);
      else readLevels(this.raw, now);
      for (let b = 0; b < BANDS; b++) {
        const target = this.raw[b];
        const k = 1 - Math.exp(-dt / (target > this.levels[b] ? ATTACK_MS : RELEASE_MS));
        this.levels[b] += (target - this.levels[b]) * k;
      }
    } else {
      const k = 1 - Math.exp(-dt / 400);
      for (let b = 0; b < BANDS; b++) {
        const d = REST - this.levels[b];
        if (Math.abs(d) > 0.003) settling = true;
        this.levels[b] += still ? d : d * k;
      }
    }
    if (this.opts.demo) this.paintDemo(still ? 0 : now);

    const waveAt = (now - this.waveStart) / WAVE_MS;
    const waving = waveAt < 1.25;
    const front = waveAt * 1.25;

    const ctx = this.ctx;
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.clearRect(0, 0, this.w, this.h);
    ctx.imageSmoothingEnabled = false;
    const cell = this.cell;
    const gap = Math.max(1.5, cell * 0.12);
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        const i = r * this.cols + c;
        const d = this.dist[i];
        let v = this.levels[this.bandOf[i]];
        // Each light flickers a touch on its own, like a real panel.
        v = v * (0.86 + 0.28 * this.jitter[i]);
        let source = this.src;
        if (waving) {
          if (d > front) source = this.prev;
          else v += 0.9 * Math.exp(-(((front - d) / 0.07) ** 2));
        }
        v = Math.min(1.15, v);
        const s = (cell - gap) * (0.28 + 0.72 * Math.min(1, v));
        ctx.globalAlpha = Math.min(1, 0.22 + 0.78 * v);
        ctx.drawImage(source, c, r, 1, 1, c * cell + (cell - s) / 2, r * cell + (cell - s) / 2, s, s);
      }
    }
    ctx.globalAlpha = 1;

    if (!still && ((this.playing) || settling || waving)) this.wake();
    else this.last = 0;
  }
}
