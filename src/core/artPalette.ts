import { create } from 'zustand';
import { useStore, type ThemeMode } from './store';
import { getCoverArtUrl, type SubsonicConfig } from './subsonic';

/**
 * Colors taken from the playing track's cover art, for the "album" accent.
 *
 * An image's colors are kept raw, as hues and chromas, and fitted to a theme only when used, so the same
 * album gives a bright accent on the dark theme and a deep one on the light theme, like the named accents.
 */

/** A color in OKLCH: lightness 0–1, chroma, hue in degrees. */
interface Lch {
  l: number;
  c: number;
  h: number;
}

/** The art's most prominent colors, most prominent first. Empty when the art has no color to speak of. */
export type ArtPalette = Lch[];

/** An art palette fitted to a theme. `stops` run from the main color outward, for gradients. */
export interface ArtColors {
  accent: string;
  dim: string;
  hover: string;
  stops: string[];
}

interface ArtPaletteState {
  /** The cover art the palette is for. */
  coverArt: string | null;
  /** Null while it loads, when there's no art, or when the server wouldn't let us read it. */
  palette: ArtPalette | null;
}

export const useArtPalette = create<ArtPaletteState>(() => ({ coverArt: null, palette: null }));

// ── Loading ──────────────────────────────────────────────────────────────────
/** Small, since only the colors matter. Not a size the UIs show, so it never shares a cache entry fetched without CORS. */
const SAMPLE_SIZE = 48;
const CACHE_LIMIT = 64;
const cache = new Map<string, ArtPalette | null>();
let wanted: string | null = null;

/**
 * Loads the palette for a cover, or clears it for no cover. Keeps the last palette while the next one
 * loads, so the accent doesn't flash to the default between tracks of different albums.
 */
export function loadArtPalette(config: SubsonicConfig | null, coverArt: string | undefined) {
  const id = (config && coverArt) || null;
  if (id === wanted) return;
  wanted = id;
  if (!id || !config) {
    useArtPalette.setState({ coverArt: null, palette: null });
    return;
  }
  if (cache.has(id)) {
    useArtPalette.setState({ coverArt: id, palette: cache.get(id) ?? null });
    return;
  }

  const img = new Image();
  img.crossOrigin = 'anonymous';
  img.decoding = 'async';
  const finish = (palette: ArtPalette | null) => {
    cache.set(id, palette);
    if (cache.size > CACHE_LIMIT) cache.delete(cache.keys().next().value!);
    if (wanted === id) useArtPalette.setState({ coverArt: id, palette });
  };
  img.onload = () => {
    try {
      finish(extractPalette(img));
    } catch {
      // A server that sends no CORS headers taints the canvas, so the default accent stays.
      finish(null);
    }
  };
  img.onerror = () => finish(null);
  img.src = getCoverArtUrl(config, id, SAMPLE_SIZE);
}

// ── Extraction ───────────────────────────────────────────────────────────────
const HUE_BINS = 24;
/** Below this chroma a pixel counts as gray, and says nothing about the art's color. */
const MIN_PIXEL_CHROMA = 0.04;
/** Colors closer in hue than this read as the same color in a gradient. */
const MIN_HUE_GAP = 35;
const MAX_COLORS = 3;
/** A secondary color has to cover at least this share of the main one's weight. */
const MIN_SHARE = 0.12;
/** Below this share of colorful pixels the art is called gray, as with black and white photos. */
const MIN_COLORFUL = 0.03;

function extractPalette(img: HTMLImageElement): ArtPalette {
  const size = 32;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return [];
  ctx.drawImage(img, 0, 0, size, size);
  const data = ctx.getImageData(0, 0, size, size).data;

  const weight = new Float64Array(HUE_BINS);
  const sumL = new Float64Array(HUE_BINS);
  const sumA = new Float64Array(HUE_BINS);
  const sumB = new Float64Array(HUE_BINS);
  let pixels = 0;
  let colorful = 0;
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] < 200) continue;
    pixels++;
    const [l, a, b] = srgbToOklab(data[i], data[i + 1], data[i + 2]);
    const c = Math.hypot(a, b);
    if (c < MIN_PIXEL_CHROMA || l < 0.12 || l > 0.97) continue;
    colorful++;
    const hue = (Math.atan2(b, a) * 180 / Math.PI + 360) % 360;
    const bin = Math.floor(hue / (360 / HUE_BINS)) % HUE_BINS;
    // Vivid pixels count for more, so a small bright patch can beat a large muddy one.
    const w = c * c;
    weight[bin] += w;
    sumL[bin] += l * w;
    sumA[bin] += a * w;
    sumB[bin] += b * w;
  }
  if (!pixels || colorful / pixels < MIN_COLORFUL) return [];

  // Each bin with its neighbors, so a color split across a bin edge isn't counted as two weak ones.
  const smoothed = Array.from({ length: HUE_BINS }, (_, bin) =>
    weight[bin] + 0.5 * (weight[(bin + HUE_BINS - 1) % HUE_BINS] + weight[(bin + 1) % HUE_BINS]));
  const order = smoothed.map((_, bin) => bin).sort((x, y) => smoothed[y] - smoothed[x]);

  const palette: ArtPalette = [];
  for (const bin of order) {
    if (palette.length >= MAX_COLORS || !weight[bin] || smoothed[bin] < smoothed[order[0]] * MIN_SHARE) break;
    const w = weight[bin];
    const a = sumA[bin] / w;
    const b = sumB[bin] / w;
    const color = { l: sumL[bin] / w, c: Math.hypot(a, b), h: (Math.atan2(b, a) * 180 / Math.PI + 360) % 360 };
    if (palette.some(p => hueGap(p.h, color.h) < MIN_HUE_GAP)) continue;
    palette.push(color);
  }
  return palette;
}

function hueGap(x: number, y: number) {
  const d = Math.abs(x - y) % 360;
  return d > 180 ? 360 - d : d;
}

// ── Fitting to a theme ───────────────────────────────────────────────────────
/** Lightness and chroma that keep an accent legible, matching the named accents in tokens.css. */
const FIT = {
  dark: { accent: 0.75, min: 0.66, max: 0.86, hover: 0.05, alpha: 0.22 },
  light: { accent: 0.53, min: 0.44, max: 0.62, hover: -0.05, alpha: 0.16 },
} as const;
const MIN_CHROMA = 0.09;
const MAX_CHROMA = 0.18;

/** The palette's colors for a theme, or null when there's nothing to show and the default accent applies. */
export function fitArtPalette(palette: ArtPalette | null, theme: ThemeMode): ArtColors | null {
  if (!palette?.length) return null;
  const fit = FIT[theme];
  const chroma = (c: number) => Math.min(MAX_CHROMA, Math.max(MIN_CHROMA, c));
  const main = { l: fit.accent, c: chroma(palette[0].c), h: palette[0].h };

  // Other colors keep some of their own lightness, within what stays legible on the page.
  const stops = [main, ...palette.slice(1).map(p => ({
    l: Math.min(fit.max, Math.max(fit.min, (p.l + fit.accent) / 2)),
    c: chroma(p.c),
    h: p.h,
  }))];
  // With only one color, the gradient runs to a lighter or deeper shade of it.
  if (stops.length === 1) stops.push({ ...main, l: theme === 'dark' ? fit.max : fit.min });

  return {
    accent: lchToHex(main),
    hover: lchToHex({ ...main, l: main.l + fit.hover }),
    dim: lchToRgba(main, fit.alpha),
    stops: stops.map(lchToHex),
  };
}

/** A color part way along `stops`, mixed in OKLab, for `t` from 0 to 1. */
export function gradientAt(stops: string[], t: number): string {
  if (stops.length < 2) return stops[0];
  const at = Math.min(1, Math.max(0, t)) * (stops.length - 1);
  const i = Math.min(stops.length - 2, Math.floor(at));
  const f = at - i;
  const [l1, a1, b1] = hexToOklab(stops[i]);
  const [l2, a2, b2] = hexToOklab(stops[i + 1]);
  return rgbToHex(oklabToSrgb(l1 + (l2 - l1) * f, a1 + (a2 - a1) * f, b1 + (b2 - b1) * f));
}

// ── Color math (OKLab, from Björn Ottosson's reference) ──────────────────────
const toLinear = (v: number) => {
  const x = v / 255;
  return x <= 0.04045 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4;
};
const fromLinear = (x: number) => 255 * (x <= 0.0031308 ? 12.92 * x : 1.055 * x ** (1 / 2.4) - 0.055);

function srgbToOklab(r8: number, g8: number, b8: number): [number, number, number] {
  const r = toLinear(r8), g = toLinear(g8), b = toLinear(b8);
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return [
    0.2104542553 * l + 0.7936177850 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.4285922050 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.8086757660 * s,
  ];
}

/** Linear sRGB, which may fall outside 0–1 for colors the screen can't show. */
function oklabToLinear(L: number, a: number, b: number): [number, number, number] {
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.2914855480 * b) ** 3;
  return [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s,
  ];
}

function oklabToSrgb(L: number, a: number, b: number): [number, number, number] {
  return oklabToLinear(L, a, b).map(x => Math.round(fromLinear(Math.min(1, Math.max(0, x))))) as [number, number, number];
}

/** Lowers chroma until the color fits in sRGB, so the hue and lightness survive. */
function lchToSrgb({ l, c, h }: Lch): [number, number, number] {
  const rad = h * Math.PI / 180;
  const inGamut = (chroma: number) =>
    oklabToLinear(l, chroma * Math.cos(rad), chroma * Math.sin(rad)).every(x => x >= -1e-4 && x <= 1 + 1e-4);
  let lo = 0;
  let hi = c;
  if (!inGamut(hi)) {
    for (let i = 0; i < 16; i++) {
      const mid = (lo + hi) / 2;
      if (inGamut(mid)) lo = mid;
      else hi = mid;
    }
    hi = lo;
  }
  return oklabToSrgb(l, hi * Math.cos(rad), hi * Math.sin(rad));
}

function rgbToHex(rgb: [number, number, number]) {
  return '#' + rgb.map(v => v.toString(16).padStart(2, '0')).join('');
}

function hexToOklab(hex: string) {
  const n = parseInt(hex.slice(1), 16);
  return srgbToOklab((n >> 16) & 255, (n >> 8) & 255, n & 255);
}

const lchToHex = (color: Lch) => rgbToHex(lchToSrgb(color));

function lchToRgba(color: Lch, alpha: number) {
  const [r, g, b] = lchToSrgb(color);
  return `rgba(${r},${g},${b},${alpha})`;
}

// ── Current colors ───────────────────────────────────────────────────────────
let fitted: { palette: ArtPalette | null; theme: ThemeMode; colors: ArtColors | null } | null = null;

/** The playing track's art colors for the current theme, or null when there are none yet. */
export function currentArtColors(): ArtColors | null {
  const { palette } = useArtPalette.getState();
  const { theme } = useStore.getState();
  if (fitted?.palette !== palette || fitted.theme !== theme) fitted = { palette, theme, colors: fitArtPalette(palette, theme) };
  return fitted.colors;
}
