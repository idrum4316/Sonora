import { atlas, atlasSlot, onImageReady, peekImage, TILE_SIZES, wantImage } from '../art';
import type { Layout } from '../layouts';
import { cellKey } from '../layouts';
import { reducedMotion } from '../motion';

/**
 * The atlas: every album as a tile on one endless canvas, panned and zoomed like a map.
 *
 * Far out, each cover is drawn as its 3×3 color grid, and the library reads as one pixel painting.
 * Closer in, real covers fade in at the size the screen needs. Tiles fly between arrangements, the
 * camera arcs out and back in on long trips, and nothing animates while nothing changes, so an open
 * atlas costs nothing while the music plays.
 */

export interface Tile {
  coverArt?: string;
  /** Key of the tile's 3×3 grid in the mosaic atlas. */
  atlasId: string;
  /** A color for the tile's glow. */
  glow?: string;
}

export interface Rect {
  left: number;
  top: number;
  width: number;
  height: number;
}

export interface Insets {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

interface Camera {
  x: number;
  y: number;
  z: number;
}

interface Flight {
  from: Camera;
  to: Camera;
  start: number;
  dur: number;
  dip: number;
}

/** How much of its cell a tile fills. The rest is the gap between lights. */
const TILE = 0.86;
/** The gap around a tile, in cells. A tile k cells wide spans k cells less one gap, so big tiles keep to the grid. */
const GAP = 1 - TILE;
/** Below this many device pixels a tile is drawn as its color grid. */
const MOSAIC_PX = 22;
/** Unlit tiles keep a trace of their color, so the shape of the library stays. */
const DIM = 0.09;
const LIT_MS = 160;
const HOVER_SCALE = 1.14;

const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);
const easeOutBack = (t: number) => {
  const c = 1.4;
  return 1 + (c + 1) * (t - 1) ** 3 + c * (t - 1) ** 2;
};
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/**
 * A tile's corner radius at a size in CSS pixels, close to the covers' radii elsewhere in the gallery.
 * Small tiles stay square: their corners would round off less than a pixel, and far out the library
 * should read as a grid of pixels.
 */
export function tileRadius(size: number): number {
  return clamp((size - 20) * 0.07, 0, 16);
}

export class WallEngine {
  private ctx: CanvasRenderingContext2D;
  private dpr = 1;
  w = 0;
  h = 0;
  insets: Insets = { top: 96, right: 32, bottom: 132, left: 32 };

  private tiles: Tile[] = [];
  private n = 0;
  private cur = new Float32Array(0);
  private from = new Float32Array(0);
  private to: Float32Array = new Float32Array(0);
  /** Each tile's width in cells, now, before and after a morph. */
  private curSize = new Float32Array(0);
  private fromSize = new Float32Array(0);
  private toSize: ArrayLike<number> = new Float32Array(0);
  private delay = new Float32Array(0);
  private morph: { start: number; dur: number; intro: boolean; spread: number } | null = null;
  private lit = new Float32Array(0);
  private litTarget: Uint8Array | null = null;
  private litMoving = false;
  layout: Layout | null = null;

  cam: Camera = { x: 0, y: 0, z: 24 };
  /** Set by any camera move other than framing everything, so the view isn't yanked back. */
  cameraMoved = false;
  private flight: Flight | null = null;
  private velocity = { x: 0, y: 0 };
  private coasting = false;

  hover = -1;
  /** A tile in the spotlight, with the rest of the wall dimmed around it, as on a tour. */
  private spot = -1;
  private spotAmount = 0;
  private pointers = new Map<number, { x: number; y: number }>();
  private dragStart: { x: number; y: number; moved: boolean } | null = null;
  private pinch: { dist: number; z: number; mid: { x: number; y: number } } | null = null;
  private lastMove = { x: 0, y: 0, t: 0 };
  private pointerScreen: { x: number; y: number } | null = null;

  private frame = 0;
  private lastFrame = 0;
  private active = true;
  private disposers: (() => void)[] = [];
  private smoothing = true;

  onHover: (index: number) => void = () => {};
  onOpen: (index: number, rect: Rect) => void = () => {};
  onFrame: () => void = () => {};
  /** The visitor took the controls, which ends a tour. */
  onUserMove: () => void = () => {};

  constructor(private canvas: HTMLCanvasElement) {
    this.ctx = canvas.getContext('2d', { alpha: true })!;
    const resize = new ResizeObserver(() => this.resize());
    resize.observe(canvas);
    this.disposers.push(() => resize.disconnect());
    this.disposers.push(onImageReady(() => this.requestDraw()));

    const on = <K extends keyof HTMLElementEventMap>(type: K, fn: (e: HTMLElementEventMap[K]) => void, opts?: AddEventListenerOptions) => {
      canvas.addEventListener(type, fn as EventListener, opts);
      this.disposers.push(() => canvas.removeEventListener(type, fn as EventListener, opts));
    };
    on('pointerdown', e => this.pointerDown(e));
    on('pointermove', e => this.pointerMove(e));
    on('pointerup', e => this.pointerUp(e));
    on('pointercancel', e => this.pointerUp(e, true));
    on('pointerleave', () => { this.pointerScreen = null; this.setHover(-1); });
    on('wheel', e => this.wheel(e), { passive: false });
    this.resize();
  }

  dispose() {
    cancelAnimationFrame(this.frame);
    this.disposers.forEach(d => d());
  }

  setActive(active: boolean) {
    this.active = active;
    if (active) {
      this.resize();
    } else {
      cancelAnimationFrame(this.frame);
      this.frame = 0;
    }
  }

  private resize() {
    const rect = this.canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    this.dpr = Math.min(2, window.devicePixelRatio || 1);
    this.w = rect.width;
    this.h = rect.height;
    this.canvas.width = Math.round(rect.width * this.dpr);
    this.canvas.height = Math.round(rect.height * this.dpr);
    this.smoothing = true;
    this.requestDraw();
  }

  // ── Content ─────────────────────────────────────────────────────────────────
  setTiles(tiles: Tile[]) {
    this.tiles = tiles;
  }

  /** Moves tiles to a new arrangement. The first one fades in as a wave from the middle. */
  setLayout(layout: Layout, animate: boolean) {
    const n = layout.pos.length / 2;
    const intro = n !== this.n;
    this.layout = layout;
    if (intro) {
      this.n = n;
      this.cur = new Float32Array(layout.pos);
      this.from = new Float32Array(layout.pos);
      this.curSize = new Float32Array(layout.size);
      this.fromSize = new Float32Array(layout.size);
      this.lit = new Float32Array(n).fill(1);
      this.litTarget = null;
      this.hover = -1;
    } else {
      this.from = new Float32Array(this.cur);
      this.fromSize = new Float32Array(this.curSize);
    }
    this.to = layout.pos;
    this.toSize = layout.size;
    this.delay = new Float32Array(n);

    if (!animate || reducedMotion()) {
      this.cur.set(layout.pos);
      this.curSize.set(layout.size);
      this.morph = null;
      this.requestDraw();
      this.onFrame();
      return;
    }

    const cx = (layout.minX + layout.maxX) / 2;
    const cy = (layout.minY + layout.maxY) / 2;
    const reach = Math.hypot(layout.maxX - layout.minX, layout.maxY - layout.minY) / 2 || 1;
    const width = layout.maxX - layout.minX || 1;
    for (let i = 0; i < n; i++) {
      const x = layout.pos[2 * i], y = layout.pos[2 * i + 1];
      this.delay[i] = intro
        // A ripple out from the center.
        ? (Math.hypot(x - cx, y - cy) / reach) * 900 + Math.random() * 140
        // A sweep from left to right, loosened so tiles don't move in lockstep.
        : ((x - layout.minX) / width) * 420 + Math.random() * 380;
    }
    this.morph = { start: performance.now(), dur: intro ? 520 : 1000, intro, spread: intro ? 1040 : 800 };
    this.requestDraw();
  }

  /** Which tiles are lit. Null lights them all. */
  setLit(mask: Uint8Array | null) {
    this.litTarget = mask && mask.length === this.n ? mask : null;
    this.litMoving = true;
    this.requestDraw();
  }

  setSpotlight(i: number) {
    this.spot = i;
    this.requestDraw();
  }

  isLit(i: number) {
    return !this.litTarget || this.litTarget[i] === 1;
  }

  // ── Camera ──────────────────────────────────────────────────────────────────
  private fitCamera(minX: number, minY: number, maxX: number, maxY: number): Camera {
    const { top, right, bottom, left } = this.insets;
    const availW = Math.max(100, this.w - left - right);
    const availH = Math.max(100, this.h - top - bottom);
    // A small library shouldn't blow a few covers up to fill the screen.
    const z = Math.min(availW / (maxX - minX), availH / (maxY - minY), Math.min(this.w, this.h) * 0.3);
    // Center in the space between the bars, not the whole canvas.
    const offX = (left - right) / 2 / z;
    const offY = (top - bottom) / 2 / z;
    return { x: (minX + maxX) / 2 - offX, y: (minY + maxY) / 2 - offY, z };
  }

  private get minZ() {
    if (!this.layout) return 2;
    const fit = this.fitCamera(this.layout.minX - 2, this.layout.minY - 2, this.layout.maxX + 2, this.layout.maxY + 2);
    return Math.max(1.5, fit.z * 0.6);
  }

  private get maxZ() {
    return Math.max(80, Math.min(this.w, this.h) * 0.8);
  }

  /** Frames the whole arrangement. */
  fit(animate = true) {
    if (!this.layout) return;
    const l = this.layout;
    const pad = 1.5;
    this.cameraMoved = false;
    const target = this.fitCamera(l.minX - pad, l.minY - pad - (l.labels.some(x => x.y < 0 && x.major) ? 1 : 0), l.maxX + pad, l.maxY + pad + (l.labels.length ? 1.5 : 0));
    this.flyTo(target, animate ? 1100 : 0);
  }

  /** Puts a tile in view at a comfortable size. `offset` shifts it left, as a fraction of the width. */
  focus(i: number, opts: { zoom?: number; dur?: number; offset?: number } = {}) {
    if (i < 0 || i >= this.n) return;
    const x = this.to[2 * i] + this.toSize[i] / 2;
    const y = this.to[2 * i + 1] + this.toSize[i] / 2;
    const z = opts.zoom ?? clamp(Math.min(this.w, this.h) * 0.22, this.minZ, this.maxZ);
    this.cameraMoved = true;
    const shift = ((opts.offset ?? 0) * this.w) / z;
    const offY = (this.insets.top - this.insets.bottom) / 2 / z;
    this.flyTo({ x: x - shift, y: y - offY, z }, opts.dur ?? 1100);
  }

  flyTo(to: Camera, dur: number) {
    this.coasting = false;
    if (!dur || reducedMotion()) {
      this.flight = null;
      this.cam = { ...to };
      this.requestDraw();
      return;
    }
    // Long trips pull back to show the ground between, then settle in.
    const span = Math.hypot(to.x - this.cam.x, to.y - this.cam.y) * Math.min(this.cam.z, to.z) / Math.max(1, this.w);
    this.flight = { from: { ...this.cam }, to, start: performance.now(), dur, dip: clamp(Math.log1p(span) * 0.9, 0, 1.6) };
    this.requestDraw();
  }

  get flying() {
    return !!this.flight;
  }

  zoomBy(factor: number, at?: { x: number; y: number }) {
    const p = at ?? { x: this.w / 2, y: this.h / 2 };
    const before = this.toWorld(p.x, p.y);
    this.cam.z = clamp(this.cam.z * factor, this.minZ, this.maxZ);
    const after = this.toWorld(p.x, p.y);
    this.cam.x += before.x - after.x;
    this.cam.y += before.y - after.y;
    this.flight = null;
    this.cameraMoved = true;
    this.rehover();
    this.requestDraw();
  }

  /** The camera moved under a still pointer, so the tile beneath it may have changed. */
  private rehover() {
    if (this.pointerScreen && !this.pointers.size) this.setHover(this.hitTest(this.pointerScreen.x, this.pointerScreen.y));
  }

  panBy(dx: number, dy: number) {
    this.cameraMoved = true;
    this.flyTo({ x: this.cam.x + dx / this.cam.z, y: this.cam.y + dy / this.cam.z, z: this.cam.z }, 380);
  }

  toWorld(sx: number, sy: number) {
    return { x: (sx - this.w / 2) / this.cam.z + this.cam.x, y: (sy - this.h / 2) / this.cam.z + this.cam.y };
  }

  /** A tile's place on screen, in CSS pixels. */
  tileRect(i: number): Rect | null {
    if (i < 0 || i >= this.n) return null;
    const z = this.cam.z;
    const s = (this.curSize[i] - GAP) * z;
    const inset = GAP / 2;
    return {
      left: (this.cur[2 * i] + inset - this.cam.x) * z + this.w / 2,
      top: (this.cur[2 * i + 1] + inset - this.cam.y) * z + this.h / 2,
      width: s,
      height: s,
    };
  }

  // ── Input ───────────────────────────────────────────────────────────────────
  private hitTest(sx: number, sy: number): number {
    if (!this.layout || this.morph) return -1;
    const { x, y } = this.toWorld(sx, sy);
    const i = this.layout.cells.get(cellKey(Math.floor(x), Math.floor(y)));
    if (i === undefined) return -1;
    // Measured from the tile's own corner, so the seams inside a big tile aren't gaps.
    const fx = x - this.cur[2 * i], fy = y - this.cur[2 * i + 1];
    const inset = GAP / 2, far = this.curSize[i] - inset;
    if (fx < inset || fx > far || fy < inset || fy > far) return -1;
    return i;
  }

  private setHover(i: number) {
    if (i === this.hover) return;
    this.hover = i;
    this.canvas.style.cursor = i >= 0 ? 'pointer' : '';
    this.onHover(i);
    this.requestDraw();
  }

  private pointerDown(e: PointerEvent) {
    // Only the main button drags and opens; a right click is for the browser.
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    this.canvas.setPointerCapture(e.pointerId);
    this.pointers.set(e.pointerId, { x: e.offsetX, y: e.offsetY });
    this.flight = null;
    this.coasting = false;
    if (this.pointers.size === 1) {
      this.dragStart = { x: e.offsetX, y: e.offsetY, moved: false };
      this.lastMove = { x: e.offsetX, y: e.offsetY, t: performance.now() };
      this.velocity = { x: 0, y: 0 };
    } else if (this.pointers.size === 2) {
      const [a, b] = [...this.pointers.values()];
      this.pinch = { dist: Math.hypot(a.x - b.x, a.y - b.y), z: this.cam.z, mid: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 } };
      if (this.dragStart) this.dragStart.moved = true;
    }
  }

  private pointerMove(e: PointerEvent) {
    this.pointerScreen = { x: e.offsetX, y: e.offsetY };
    const p = this.pointers.get(e.pointerId);
    if (!p) {
      this.setHover(this.hitTest(e.offsetX, e.offsetY));
      return;
    }
    const dx = e.offsetX - p.x, dy = e.offsetY - p.y;
    p.x = e.offsetX;
    p.y = e.offsetY;

    if (this.pinch && this.pointers.size >= 2) {
      const [a, b] = [...this.pointers.values()];
      const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
      const dist = Math.hypot(a.x - b.x, a.y - b.y);
      this.cam.x -= (mid.x - this.pinch.mid.x) / this.cam.z;
      this.cam.y -= (mid.y - this.pinch.mid.y) / this.cam.z;
      this.pinch.mid = mid;
      this.cameraMoved = true;
      this.zoomBy((this.pinch.z * dist) / this.pinch.dist / this.cam.z, mid);
      this.onUserMove();
      return;
    }
    if (!this.dragStart) return;
    if (!this.dragStart.moved && Math.hypot(e.offsetX - this.dragStart.x, e.offsetY - this.dragStart.y) < 5) return;
    if (!this.dragStart.moved) {
      this.dragStart.moved = true;
      this.setHover(-1);
      this.canvas.classList.add('is-dragging');
      this.cameraMoved = true;
      this.onUserMove();
    }
    this.cam.x -= dx / this.cam.z;
    this.cam.y -= dy / this.cam.z;
    const now = performance.now();
    const dt = Math.max(1, now - this.lastMove.t);
    // Smoothed, so one jittery event doesn't decide the throw.
    this.velocity.x = this.velocity.x * 0.6 + (dx / dt) * 0.4;
    this.velocity.y = this.velocity.y * 0.6 + (dy / dt) * 0.4;
    this.lastMove = { x: e.offsetX, y: e.offsetY, t: now };
    this.requestDraw();
  }

  private pointerUp(e: PointerEvent, cancelled = false) {
    this.pointers.delete(e.pointerId);
    if (this.pointers.size < 2) this.pinch = null;
    if (this.pointers.size) return;
    this.canvas.classList.remove('is-dragging');
    const drag = this.dragStart;
    this.dragStart = null;
    if (!drag || cancelled) return;
    if (drag.moved) {
      const idle = performance.now() - this.lastMove.t;
      if (idle < 80 && Math.hypot(this.velocity.x, this.velocity.y) > 0.15 && !reducedMotion()) {
        this.coasting = true;
        this.requestDraw();
      }
      return;
    }
    const i = this.hitTest(e.offsetX, e.offsetY);
    if (i >= 0) {
      const rect = this.tileRect(i)!;
      const box = this.canvas.getBoundingClientRect();
      this.onOpen(i, { ...rect, left: rect.left + box.left, top: rect.top + box.top });
    }
  }

  private wheel(e: WheelEvent) {
    e.preventDefault();
    this.onUserMove();
    this.coasting = false;
    const unit = e.deltaMode === 1 ? 32 : e.deltaMode === 2 ? this.h : 1;
    // A sideways swipe pans; everything else zooms about the pointer, like a map.
    if (!e.ctrlKey && Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
      this.flight = null;
      this.cam.x += (e.deltaX * unit) / this.cam.z;
      this.requestDraw();
      return;
    }
    const speed = e.ctrlKey ? 0.012 : 0.0018;
    this.zoomBy(Math.exp(-e.deltaY * unit * speed), { x: e.offsetX, y: e.offsetY });
  }

  // ── Drawing ─────────────────────────────────────────────────────────────────
  requestDraw() {
    if (!this.active || this.frame) return;
    this.frame = requestAnimationFrame(t => {
      this.frame = 0;
      this.draw(t);
    });
  }

  private step(now: number): boolean {
    const dt = this.lastFrame ? Math.min(64, now - this.lastFrame) : 16;
    this.lastFrame = now;
    let moving = false;

    if (this.flight) {
      const f = this.flight;
      const t = clamp((now - f.start) / f.dur, 0, 1);
      const e = easeInOut(t);
      const logZ = Math.log(f.from.z) + (Math.log(f.to.z) - Math.log(f.from.z)) * e - f.dip * Math.sin(Math.PI * e);
      this.cam = {
        x: f.from.x + (f.to.x - f.from.x) * e,
        y: f.from.y + (f.to.y - f.from.y) * e,
        z: Math.exp(logZ),
      };
      if (t >= 1) {
        this.flight = null;
        this.rehover();
      } else {
        moving = true;
      }
    }

    if (this.coasting) {
      this.cam.x -= (this.velocity.x * dt) / this.cam.z;
      this.cam.y -= (this.velocity.y * dt) / this.cam.z;
      const decay = Math.exp(-dt / 320);
      this.velocity.x *= decay;
      this.velocity.y *= decay;
      if (Math.hypot(this.velocity.x, this.velocity.y) < 0.01) {
        this.coasting = false;
        this.rehover();
      } else {
        moving = true;
      }
    }

    if (this.morph) {
      const m = this.morph;
      const elapsed = now - m.start;
      if (elapsed >= m.dur + m.spread) {
        this.cur.set(this.to);
        this.curSize.set(this.toSize);
        this.morph = null;
        if (this.pointerScreen) this.setHover(this.hitTest(this.pointerScreen.x, this.pointerScreen.y));
      } else {
        moving = true;
        if (!m.intro) {
          for (let i = 0; i < this.n; i++) {
            const t = clamp((elapsed - this.delay[i]) / m.dur, 0, 1);
            const e = easeInOut(t);
            this.cur[2 * i] = this.from[2 * i] + (this.to[2 * i] - this.from[2 * i]) * e;
            this.cur[2 * i + 1] = this.from[2 * i + 1] + (this.to[2 * i + 1] - this.from[2 * i + 1]) * e;
            this.curSize[i] = this.fromSize[i] + (this.toSize[i] - this.fromSize[i]) * e;
          }
        }
      }
    }

    // The spotlight comes up once the camera arrives, and goes down as soon as it moves on.
    const spotTarget = this.spot >= 0 && !this.flight ? 1 : 0;
    if (this.spotAmount !== spotTarget) {
      const k = 1 - Math.exp(-dt / 380);
      this.spotAmount += (spotTarget - this.spotAmount) * k;
      if (Math.abs(spotTarget - this.spotAmount) < 0.004) this.spotAmount = spotTarget;
      else moving = true;
    }

    if (this.litMoving) {
      const k = 1 - Math.exp(-dt / LIT_MS);
      let still = true;
      for (let i = 0; i < this.n; i++) {
        const target = !this.litTarget || this.litTarget[i] ? 1 : DIM;
        const d = target - this.lit[i];
        if (Math.abs(d) > 0.004) {
          this.lit[i] += d * k;
          still = false;
        } else {
          this.lit[i] = target;
        }
      }
      if (still) this.litMoving = false;
      else moving = true;
    }
    return moving;
  }

  /** Scale and opacity of a tile partway through a morph. */
  private morphState(i: number, now: number): [number, number] {
    const m = this.morph;
    if (!m) return [1, 1];
    const t = clamp((now - m.start - this.delay[i]) / m.dur, 0, 1);
    if (m.intro) return [Math.max(0, easeOutBack(t)), Math.min(1, t * 2.5)];
    // Tiles dip as they travel, as if lifted off the wall and set back down.
    return [1 - 0.34 * Math.sin(Math.PI * easeInOut(t)), 1];
  }

  private setSmoothing(on: boolean) {
    if (this.smoothing === on) return;
    this.smoothing = on;
    this.ctx.imageSmoothingEnabled = on;
    if (on) this.ctx.imageSmoothingQuality = 'medium';
  }

  private drawTile(i: number, x: number, y: number, s: number) {
    const ctx = this.ctx;
    const r = tileRadius(s);
    if (r < 1) {
      this.paintTile(i, x, y, s);
      return;
    }
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(x, y, s, s, r);
    ctx.clip();
    this.paintTile(i, x, y, s);
    ctx.restore();
    this.smoothing = ctx.imageSmoothingEnabled;
  }

  private paintTile(i: number, x: number, y: number, s: number) {
    const ctx = this.ctx;
    const tile = this.tiles[i];
    const px = s * this.dpr;
    if (px >= MOSAIC_PX && tile.coverArt) {
      const size = TILE_SIZES.find(sz => sz >= px * 0.85) ?? TILE_SIZES[TILE_SIZES.length - 1];
      let img = wantImage(tile.coverArt, size);
      if (!img) {
        // Something sharper or blurrier already loaded beats a flat mosaic.
        for (let k = TILE_SIZES.length - 1; k >= 0 && !img; k--) img = peekImage(tile.coverArt, TILE_SIZES[k]);
      }
      if (img) {
        this.setSmoothing(true);
        ctx.drawImage(img, x, y, s, s);
        return;
      }
    }
    const slot = atlasSlot(tile.atlasId);
    if (slot) {
      this.setSmoothing(false);
      ctx.drawImage(atlas, slot.x, slot.y, 3, 3, x, y, s, s);
    } else {
      ctx.fillStyle = '#17171f';
      ctx.fillRect(x, y, s, s);
    }
  }

  private draw(now: number) {
    if (!this.active || !this.w) return;
    const moving = this.step(now);
    const ctx = this.ctx;
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.clearRect(0, 0, this.w, this.h);
    this.smoothing = ctx.imageSmoothingEnabled;

    const { x: camX, y: camY, z } = this.cam;
    const halfW = this.w / 2, halfH = this.h / 2;
    const left = camX - halfW / z - 1, right = camX + halfW / z;
    const top = camY - halfH / z - 1, bottom = camY + halfH / z;

    const spotDim = 1 - 0.72 * this.spotAmount;
    const spot = this.spotAmount > 0 ? this.spot : -1;
    for (let i = 0; i < this.n; i++) {
      const x = this.cur[2 * i], y = this.cur[2 * i + 1], size = this.curSize[i];
      if (x + size - 1 < left || x > right || y + size - 1 < top || y > bottom) continue;
      if (i === this.hover || i === spot) continue;
      const [scale, alpha] = this.morphState(i, now);
      if (alpha <= 0 || scale <= 0) continue;
      const s = (size - GAP) * z * scale;
      const cx = (x + size / 2 - camX) * z + halfW;
      const cy = (y + size / 2 - camY) * z + halfH;
      ctx.globalAlpha = alpha * this.lit[i] * spotDim;
      this.drawTile(i, cx - s / 2, cy - s / 2, s);
    }
    ctx.globalAlpha = 1;

    this.drawLabels();

    // The spotlit and hovered tiles go on top, raised and glowing in their own color.
    for (const i of spot === this.hover ? [spot] : [spot, this.hover]) {
      if (i < 0 || i >= this.n) continue;
      const size = this.curSize[i];
      // Big tiles lift less, so a hovered one doesn't swallow its neighbors.
      const lift = i === this.hover ? 1 + (HOVER_SCALE - 1) / size : 1 + 0.06 * this.spotAmount;
      const s = (size - GAP) * z * lift;
      const cx = (this.cur[2 * i] + size / 2 - camX) * z + halfW;
      const cy = (this.cur[2 * i + 1] + size / 2 - camY) * z + halfH;
      ctx.save();
      ctx.globalAlpha = Math.max(0.35, this.lit[i]);
      // The glow comes from a rounded plate behind the tile, since the tile itself is clipped to its corners.
      ctx.shadowColor = this.tiles[i].glow ?? 'rgba(255,255,255,0.5)';
      ctx.shadowBlur = Math.min(i === spot ? 90 : 60, 8 + s * 0.35);
      ctx.fillStyle = '#0b0b10';
      ctx.beginPath();
      ctx.roundRect(cx - s / 2, cy - s / 2, s, s, tileRadius(s));
      ctx.fill();
      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;
      this.drawTile(i, cx - s / 2, cy - s / 2, s);
      ctx.restore();
      this.smoothing = ctx.imageSmoothingEnabled;
    }
    this.onFrame();
    if (moving) this.requestDraw();
  }

  private drawLabels() {
    const labels = this.layout?.labels;
    if (!labels?.length) return;
    const ctx = this.ctx;
    const { x: camX, y: camY, z } = this.cam;
    ctx.textBaseline = 'top';
    for (const label of labels) {
      const px = label.size * z;
      if (px < (label.major ? 10 : 8) || px > 420) continue;
      const sx = (label.x - camX) * z + this.w / 2;
      const sy = (label.y - camY) * z + this.h / 2;
      if (sy > this.h || sy + px < 0 || sx > this.w + 400 || sx < -2000) continue;
      ctx.textAlign = label.align;
      if (label.major) {
        ctx.font = `700 ${px}px "Bricolage Grotesque", system-ui, sans-serif`;
        ctx.fillStyle = 'rgba(240, 238, 255, 0.34)';
      } else {
        ctx.font = `500 ${px}px "Geist Mono", ui-monospace, monospace`;
        ctx.fillStyle = 'rgba(240, 238, 255, 0.42)';
      }
      ctx.fillText(label.text, sx, sy);
    }
  }
}
