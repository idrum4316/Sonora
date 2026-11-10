import { create } from 'zustand';
import { lchToHex, srgbToOklab } from '../core/artPalette';
import { useStore } from '../core/store';
import { getCoverArtUrl } from '../core/subsonic';

/**
 * Everything the gallery knows about cover art: where to get it at each size, which images are loaded,
 * and what colors each cover holds.
 *
 * Colors come from a tiny copy of each cover, fetched with CORS so its pixels can be read. Each cover is
 * boiled down to a 3×3 grid of colors plus its overall lightness, colorfulness and hue. That's enough to
 * sort a whole library by color, paint it as a mosaic when zoomed out, and find covers that look alike.
 * The results persist, so the second visit paints at once.
 */

export function coverUrl(coverArt: string, size: number): string {
  const config = useStore.getState().config;
  return config ? getCoverArtUrl(config, coverArt, size) : '';
}

/** Not a size any <img> uses, so a CORS fetch never meets a cached copy fetched without CORS. */
export const SAMPLE_SIZE = 40;
/** Sizes the atlas draws, smallest first. */
export const TILE_SIZES = [SAMPLE_SIZE, 160, 400, 800] as const;

// ── Image cache ──────────────────────────────────────────────────────────────
interface Entry {
  img: HTMLImageElement;
  ready: boolean;
  failed: boolean;
  used: number;
}

const images = new Map<string, Entry>();
/** How many images of each size are cached, so eviction only looks when a size is over its limit. */
const counts = new Map<number, number>();
const countSize = (size: number, by: number) => counts.set(size, (counts.get(size) ?? 0) + by);
/** Requests waiting for a slot, by key, with the last time something asked for them. */
const waiting = new Map<string, { coverArt: string; size: number; wanted: number }>();
let active = 0;
const MAX_ACTIVE = 10;
/** Requests nobody asked for again within this long have scrolled away. */
const STALE_MS = 1500;
const LIMITS: Record<number, number> = { 160: 700, 400: 160, 800: 40 };
const readyListeners = new Set<() => void>();

const keyOf = (coverArt: string, size: number) => `${size}:${coverArt}`;

/** Called whenever an image finishes loading, so canvases can repaint. */
export function onImageReady(listener: () => void): () => void {
  readyListeners.add(listener);
  return () => readyListeners.delete(listener);
}

let notifyQueued = false;
function notifyReady() {
  if (notifyQueued) return;
  notifyQueued = true;
  requestAnimationFrame(() => {
    notifyQueued = false;
    readyListeners.forEach(l => l());
  });
}

/** A loaded image, without asking for it. */
export function peekImage(coverArt: string, size: number): HTMLImageElement | null {
  const entry = images.get(keyOf(coverArt, size));
  if (!entry?.ready) return null;
  entry.used = performance.now();
  return entry.img;
}

/** A loaded image, or null while it loads. Asking again keeps the request near the front of the line. */
export function wantImage(coverArt: string, size: number): HTMLImageElement | null {
  const key = keyOf(coverArt, size);
  const entry = images.get(key);
  if (entry) {
    entry.used = performance.now();
    return entry.ready ? entry.img : null;
  }
  if (size === SAMPLE_SIZE && !samples.has(coverArt) && !useSamples.getState().blocked) {
    // An unread cover goes through the color reader, which keeps the image for drawing.
    requestSample(coverArt, true);
    return null;
  }
  const now = performance.now();
  const queued = waiting.get(key);
  if (queued) queued.wanted = now;
  else waiting.set(key, { coverArt, size, wanted: now });
  schedulePump();
  return null;
}

let pumpQueued = false;
/** A frame asks for hundreds of images; sort the line once after it, not once per ask. */
function schedulePump() {
  if (pumpQueued) return;
  pumpQueued = true;
  queueMicrotask(() => {
    pumpQueued = false;
    pump();
  });
}

function pump() {
  if (active >= MAX_ACTIVE || !waiting.size) return;
  const now = performance.now();
  const order = [...waiting.entries()]
    .filter(([key, w]) => {
      if (now - w.wanted > STALE_MS) { waiting.delete(key); return false; }
      return true;
    })
    // Most recently wanted first: whatever is on screen right now.
    .sort((a, b) => b[1].wanted - a[1].wanted || a[1].size - b[1].size);
  for (const [key, w] of order) {
    if (active >= MAX_ACTIVE) break;
    waiting.delete(key);
    load(key, w.coverArt, w.size);
  }
}

function load(key: string, coverArt: string, size: number) {
  const img = new Image();
  img.decoding = 'async';
  const entry: Entry = { img, ready: false, failed: false, used: performance.now() };
  images.set(key, entry);
  active++;
  const done = () => {
    active--;
    pump();
  };
  img.onload = () => {
    entry.ready = true;
    countSize(size, 1);
    done();
    evict(size);
    notifyReady();
  };
  img.onerror = () => {
    entry.failed = true;
    done();
    // A blip in the network shouldn't leave a cover missing all session.
    setTimeout(() => { if (images.get(key) === entry) images.delete(key); }, 15000);
  };
  img.src = coverUrl(coverArt, size);
}

function evict(size: number) {
  const limit = LIMITS[size];
  if (!limit || (counts.get(size) ?? 0) <= limit + 20) return;
  // Trim a little below the limit, so this runs once per batch of loads rather than once per load.
  const prefix = `${size}:`;
  // Never what was drawn just now: evicting on-screen covers would reload them forever.
  const recent = performance.now() - 1500;
  const mine = [...images.entries()].filter(([k, e]) => e.ready && e.used < recent && k.startsWith(prefix));
  mine.sort((a, b) => a[1].used - b[1].used);
  const drop = mine.slice(0, Math.max(0, mine.length - limit));
  for (const [k] of drop) images.delete(k);
  countSize(size, -drop.length);
}

/** Starts loading an image ahead of need, such as the hero of the view about to open. */
export function preload(coverArt: string | undefined, size: number) {
  if (!coverArt) return;
  const img = new Image();
  img.decoding = 'async';
  img.src = coverUrl(coverArt, size);
}

// ── Color samples ────────────────────────────────────────────────────────────
export interface ArtSample {
  /** 3×3 colors, row by row, as "rrggbb" each. */
  grid: string[];
  /** Mean OKLab lightness, 0–1. */
  l: number;
  /** Mean chroma: how colorful the cover is overall. */
  c: number;
  /** Hue of the cover's most prominent color, in degrees. */
  h: number;
}

const STORAGE_KEY = 'sonora-gallery-colors-v1';
const samples = new Map<string, ArtSample | null>();
/** Covers waiting to be read: on screen first, most recently wanted first, then everything else in order. */
const urgentQueue: string[] = [];
const sampleQueue: string[] = [];
const queued = new Set<string>();
const reading = new Set<string>();
const URGENT_LIMIT = 300;
const sampleWaiters = new Map<string, ((s: ArtSample | null) => void)[]>();
const MAX_SAMPLING = 6;
let corsOk = 0;
let corsFailed = 0;

interface SampleState {
  /** Bumps whenever samples arrive, so layouts that sort by color know to update. */
  version: number;
  /** True once covers turn out not to allow CORS, so their colors can't be read. */
  blocked: boolean;
}
export const useSamples = create<SampleState>(() => ({ version: 0, blocked: false }));

// Load what earlier visits learned.
try {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw) {
    const stored = JSON.parse(raw) as Record<string, string>;
    for (const [id, packed] of Object.entries(stored)) {
      const [grid, l, c, h] = packed.split('|');
      if (grid?.length !== 54) continue;
      samples.set(id, { grid: grid.match(/.{6}/g)!, l: +l, c: +c, h: +h });
    }
  }
} catch {
  // Private windows and blocked storage just start without a cache.
}

let saveTimer = 0;
function scheduleSave() {
  clearTimeout(saveTimer);
  saveTimer = window.setTimeout(() => {
    const out: Record<string, string> = {};
    for (const [id, s] of samples) {
      if (s) out[id] = `${s.grid.join('')}|${s.l.toFixed(3)}|${s.c.toFixed(3)}|${Math.round(s.h)}`;
    }
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(out));
    } catch {
      // Full or blocked storage only costs the next visit some time.
    }
  }, 2000);
}

let versionTimer = 0;
function bumpVersion() {
  if (versionTimer) return;
  versionTimer = window.setTimeout(() => {
    versionTimer = 0;
    useSamples.setState(s => ({ version: s.version + 1 }));
  }, 250);
}

export function getSample(coverArt: string | undefined): ArtSample | null {
  return coverArt ? samples.get(coverArt) ?? null : null;
}

export function hasSample(coverArt: string): boolean {
  return samples.has(coverArt);
}

/** Queues a cover to have its colors read. `urgent` jumps the line. */
export function requestSample(coverArt: string, urgent = false) {
  if (samples.has(coverArt) || reading.has(coverArt) || useSamples.getState().blocked) return;
  if (!queued.has(coverArt)) {
    queued.add(coverArt);
    if (!urgent) sampleQueue.push(coverArt);
  }
  if (urgent && urgentQueue[urgentQueue.length - 1] !== coverArt) {
    // May hold repeats and covers since read; those are skipped when they come up.
    urgentQueue.push(coverArt);
    if (urgentQueue.length > URGENT_LIMIT) {
      // Trimmed covers still get read, in their turn.
      for (const id of urgentQueue.splice(0, urgentQueue.length - URGENT_LIMIT)) if (queued.has(id)) sampleQueue.push(id);
    }
  }
  pumpSamples();
}

function nextSample(): string | undefined {
  while (urgentQueue.length) {
    const id = urgentQueue.pop()!;
    if (queued.has(id)) return id;
  }
  while (sampleQueue.length) {
    const id = sampleQueue.shift()!;
    if (queued.has(id)) return id;
  }
  return undefined;
}

/** The cover's colors, read now if they aren't known yet. Null if they can't be read. */
export function ensureSample(coverArt: string | undefined): Promise<ArtSample | null> {
  if (!coverArt) return Promise.resolve(null);
  if (samples.has(coverArt)) return Promise.resolve(samples.get(coverArt)!);
  if (useSamples.getState().blocked) return Promise.resolve(null);
  return new Promise(resolve => {
    const list = sampleWaiters.get(coverArt) ?? [];
    list.push(resolve);
    sampleWaiters.set(coverArt, list);
    requestSample(coverArt, true);
  });
}

/** How many covers still need reading. */
export function pendingSamples(): number {
  return queued.size + reading.size;
}

function pumpSamples() {
  while (reading.size < MAX_SAMPLING) {
    const coverArt = nextSample();
    if (!coverArt) return;
    queued.delete(coverArt);
    reading.add(coverArt);
    readSample(coverArt).then(sample => {
      reading.delete(coverArt);
      if (sample !== undefined) {
        samples.set(coverArt, sample);
        if (sample) addToAtlas(coverArt, sample);
        scheduleSave();
        bumpVersion();
      }
      sampleWaiters.get(coverArt)?.forEach(w => w(sample ?? null));
      sampleWaiters.delete(coverArt);
      // Reading is done, even if the last few failed: let color sorts settle.
      if (!pendingSamples()) bumpVersion();
      pumpSamples();
    });
  }
}

const sampleCanvas = document.createElement('canvas');
const SAMPLE_GRID = 12;
sampleCanvas.width = SAMPLE_GRID;
sampleCanvas.height = SAMPLE_GRID;
const sampleCtx = sampleCanvas.getContext('2d', { willReadFrequently: true });

/** Resolves undefined when the cover couldn't load at all, so it's tried again on a later visit. */
function readSample(coverArt: string): Promise<ArtSample | null | undefined> {
  return new Promise(resolve => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.decoding = 'async';
    img.onload = () => {
      corsOk++;
      // Keep the image: it's also the smallest size the atlas draws.
      images.set(keyOf(coverArt, SAMPLE_SIZE), { img, ready: true, failed: false, used: performance.now() });
      notifyReady();
      try {
        resolve(analyse(img));
      } catch {
        resolve(null);
      }
    };
    img.onerror = () => {
      corsFailed++;
      // Many failures and no successes means the server doesn't send CORS headers for art.
      if (corsFailed >= 6 && corsOk === 0) {
        useSamples.setState({ blocked: true });
        sampleQueue.length = 0;
        urgentQueue.length = 0;
        queued.clear();
        for (const waiters of sampleWaiters.values()) waiters.forEach(w => w(null));
        sampleWaiters.clear();
      }
      // Still draw the cover, fetched the ordinary way.
      loadPlain(coverArt);
      resolve(undefined);
    };
    img.src = coverUrl(coverArt, SAMPLE_SIZE);
  });
}

function loadPlain(coverArt: string) {
  const key = keyOf(coverArt, SAMPLE_SIZE);
  if (images.has(key)) return;
  const img = new Image();
  img.decoding = 'async';
  const entry: Entry = { img, ready: false, failed: false, used: performance.now() };
  images.set(key, entry);
  img.onload = () => { entry.ready = true; notifyReady(); };
  img.onerror = () => { entry.failed = true; };
  img.src = coverUrl(coverArt, SAMPLE_SIZE);
}

const HUE_BINS = 24;

function analyse(img: HTMLImageElement): ArtSample | null {
  if (!sampleCtx) return null;
  sampleCtx.clearRect(0, 0, SAMPLE_GRID, SAMPLE_GRID);
  sampleCtx.drawImage(img, 0, 0, SAMPLE_GRID, SAMPLE_GRID);
  const data = sampleCtx.getImageData(0, 0, SAMPLE_GRID, SAMPLE_GRID).data;

  const cell = SAMPLE_GRID / 3;
  const sums = Array.from({ length: 9 }, () => [0, 0, 0, 0]);
  const binW = new Float64Array(HUE_BINS);
  const binA = new Float64Array(HUE_BINS);
  const binB = new Float64Array(HUE_BINS);
  let sumL = 0;
  let sumC = 0;
  let n = 0;
  for (let y = 0; y < SAMPLE_GRID; y++) {
    for (let x = 0; x < SAMPLE_GRID; x++) {
      const i = (y * SAMPLE_GRID + x) * 4;
      const r = data[i], g = data[i + 1], b = data[i + 2];
      const s = sums[Math.floor(y / cell) * 3 + Math.floor(x / cell)];
      s[0] += r; s[1] += g; s[2] += b; s[3]++;
      const [L, A, B] = srgbToOklab(r, g, b);
      const C = Math.hypot(A, B);
      sumL += L;
      sumC += C;
      n++;
      if (C > 0.03) {
        const hue = (Math.atan2(B, A) * 180 / Math.PI + 360) % 360;
        const bin = Math.floor(hue / (360 / HUE_BINS)) % HUE_BINS;
        const w = C * C;
        binW[bin] += w;
        binA[bin] += A * w;
        binB[bin] += B * w;
      }
    }
  }
  let best = 0;
  for (let bin = 1; bin < HUE_BINS; bin++) if (binW[bin] > binW[best]) best = bin;
  const h = binW[best] ? (Math.atan2(binB[best], binA[best]) * 180 / Math.PI + 360) % 360 : 0;
  const grid = sums.map(([r, g, b, count]) =>
    [r, g, b].map(v => Math.round(v / count).toString(16).padStart(2, '0')).join(''));
  return { grid, l: sumL / n, c: sumC / n, h };
}

// ── Mosaic atlas ─────────────────────────────────────────────────────────────
/**
 * Every sampled cover's 3×3 grid, packed into one small canvas. Drawn scaled up with smoothing off,
 * each cover becomes nine crisp squares: the library as a pixel painting when zoomed far out.
 */
const ATLAS_COLS = 128;
export const atlas = document.createElement('canvas');
const atlasSlots = new Map<string, number>();
let atlasCtx = atlas.getContext('2d');
atlas.width = ATLAS_COLS * 3;
atlas.height = 3 * 32;

function addToAtlas(id: string, sample: ArtSample) {
  if (atlasSlots.has(id) || !atlasCtx) return;
  const slot = atlasSlots.size;
  const rowsNeeded = Math.floor(slot / ATLAS_COLS) + 1;
  if (rowsNeeded * 3 > atlas.height) {
    const copy = document.createElement('canvas');
    copy.width = atlas.width;
    copy.height = atlas.height;
    copy.getContext('2d')!.drawImage(atlas, 0, 0);
    atlas.height = atlas.height * 2;
    atlasCtx = atlas.getContext('2d');
    atlasCtx!.drawImage(copy, 0, 0);
  }
  atlasSlots.set(id, slot);
  const ox = (slot % ATLAS_COLS) * 3;
  const oy = Math.floor(slot / ATLAS_COLS) * 3;
  sample.grid.forEach((hex, i) => {
    atlasCtx!.fillStyle = `#${hex}`;
    atlasCtx!.fillRect(ox + (i % 3), oy + Math.floor(i / 3), 1, 1);
  });
}

for (const [id, s] of samples) if (s) addToAtlas(id, s);

/** Where a cover's 3×3 grid sits in the atlas, or null if it has none yet. */
export function atlasSlot(id: string): { x: number; y: number } | null {
  const slot = atlasSlots.get(id);
  if (slot === undefined) return null;
  return { x: (slot % ATLAS_COLS) * 3, y: Math.floor(slot / ATLAS_COLS) * 3 };
}

/**
 * A made-up sample for an album with no art, from its name: a small pattern in two related hues,
 * so it still has a place in the mosaic and the color sort.
 */
export function generatedSample(seed: string): ArtSample {
  let hash = 2166136261;
  for (let i = 0; i < seed.length; i++) hash = Math.imul(hash ^ seed.charCodeAt(i), 16777619);
  const h = (hash >>> 0) % 360;
  const pattern = (hash >>> 9) & 511;
  const a = lchToHex({ l: 0.55, c: 0.12, h }).slice(1);
  const b = lchToHex({ l: 0.32, c: 0.09, h: (h + 40) % 360 }).slice(1);
  const grid = Array.from({ length: 9 }, (_, i) => (pattern >> i) & 1 ? a : b);
  const sample = { grid, l: 0.45, c: 0.1, h };
  addToAtlas(`gen:${seed}`, sample);
  return sample;
}

// ── Palettes ─────────────────────────────────────────────────────────────────
export interface Palette {
  /** Bright, legible on the dark gallery. */
  accent: string;
  /** Deep, for washes behind content. */
  deep: string;
  /** A second deep color, for gradients. */
  deep2: string;
  /** Up to four distinct colors straight from the art, for swatches. */
  swatches: string[];
}

export const NEUTRAL_PALETTE: Palette = {
  accent: '#e9e6ff',
  deep: '#14131c',
  deep2: '#0b0b10',
  swatches: [],
};

function hexToLab(hex: string): [number, number, number] {
  const n = parseInt(hex, 16);
  return srgbToOklab((n >> 16) & 255, (n >> 8) & 255, n & 255);
}

export function paletteOf(sample: ArtSample | null): Palette {
  if (!sample) return NEUTRAL_PALETTE;
  const labs = sample.grid.map(hexToLab);

  // The most different colors in the grid, picked greedily from the most colorful one.
  const order = labs.map((lab, i) => ({ i, c: Math.hypot(lab[1], lab[2]) })).sort((x, y) => y.c - x.c);
  const picked = [order[0].i];
  while (picked.length < 4) {
    let bestI = -1;
    let bestD = 0;
    labs.forEach((lab, i) => {
      if (picked.includes(i)) return;
      const d = Math.min(...picked.map(p => labDistance(lab, labs[p])));
      if (d > bestD) { bestD = d; bestI = i; }
    });
    if (bestI < 0 || bestD < 0.06) break;
    picked.push(bestI);
  }

  const chroma = Math.min(0.16, Math.max(0.035, sample.c * 1.6));
  const gray = sample.c < 0.025;
  const second = labs[picked[1] ?? picked[0]];
  const h2 = (Math.atan2(second[2], second[1]) * 180 / Math.PI + 360) % 360;
  return {
    accent: lchToHex({ l: 0.82, c: gray ? 0.02 : chroma, h: sample.h }),
    deep: lchToHex({ l: 0.26, c: gray ? 0.01 : Math.min(0.09, chroma), h: sample.h }),
    deep2: lchToHex({ l: 0.18, c: gray ? 0.01 : Math.min(0.08, chroma), h: h2 }),
    swatches: picked.map(i => `#${sample.grid[i]}`),
  };
}

function labDistance(a: number[], b: number[]) {
  return Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
}

// ── Kindred covers ───────────────────────────────────────────────────────────
const labCache = new Map<string, number[]>();

/** Hue and colorfulness count for more than lightness: two red covers are kin even if one is darker. */
const CHROMA_WEIGHT = 2.4;

function labVector(id: string, sample: ArtSample): number[] {
  let v = labCache.get(id);
  if (!v) {
    v = sample.grid.flatMap(hex => {
      const [l, a, b] = hexToLab(hex);
      return [l, a * CHROMA_WEIGHT, b * CHROMA_WEIGHT];
    });
    labCache.set(id, v);
  }
  return v;
}

/** The items whose covers look most like this one: same colors in roughly the same places. */
export function kindred<T extends { coverArt?: string }>(coverArt: string, items: T[], count: number, skip?: (item: T) => boolean): T[] {
  const sample = samples.get(coverArt);
  if (!sample) return [];
  const target = labVector(coverArt, sample);
  const scored: { item: T; d: number }[] = [];
  const seen = new Set<string>([coverArt]);
  for (const item of items) {
    if (!item.coverArt || seen.has(item.coverArt) || skip?.(item)) continue;
    const s = samples.get(item.coverArt);
    if (!s) continue;
    seen.add(item.coverArt);
    const v = labVector(item.coverArt, s);
    let d = 0;
    for (let i = 0; i < v.length; i++) d += (v[i] - target[i]) ** 2;
    scored.push({ item, d });
  }
  return scored.sort((a, b) => a.d - b.d).slice(0, count).map(s => s.item);
}
