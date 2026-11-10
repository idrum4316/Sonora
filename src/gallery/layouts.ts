import type { Album } from '../core/subsonic';
import { albumSample, sortName, type Arrangement } from './library';

/**
 * Where each album sits on the atlas, in grid cells. A tile fills most of its cell, and the rest is the
 * gap that makes the wall read as a grid of lights.
 */

export interface Label {
  x: number;
  y: number;
  text: string;
  /** Text height, in cells. */
  size: number;
  align: 'left' | 'center';
  /** Major labels stay readable when zoomed out; minor ones only show up close. */
  major: boolean;
}

export interface Layout {
  /** x, y per album, in the album list's order: the top left cell of its tile. */
  pos: Float32Array;
  /** Each album's tile width, in cells. Most are 1. */
  size: Uint8Array;
  labels: Label[];
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  /** Album index by cell, for finding what's under the pointer. */
  cells: Map<number, number>;
}

export const cellKey = (x: number, y: number) => (x + 32768) * 65536 + (y + 32768);

/** Below this colorfulness a cover reads as black and white. */
const GRAY_CHROMA = 0.035;

export function arrange(arrangement: Arrangement, albums: Album[], aspect: number): Layout {
  switch (arrangement) {
    case 'spectrum': return spectrum(albums, aspect);
    case 'timeline': return timeline(albums, aspect);
    case 'alphabet': return alphabet(albums, aspect);
    case 'rings': return rings(albums);
  }
}

function finish(pos: Float32Array, labels: Label[], size = new Uint8Array(pos.length / 2).fill(1)): Layout {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  const cells = new Map<number, number>();
  for (let i = 0; i < pos.length / 2; i++) {
    const x = pos[2 * i], y = pos[2 * i + 1], k = size[i];
    minX = Math.min(minX, x); minY = Math.min(minY, y);
    maxX = Math.max(maxX, x + k); maxY = Math.max(maxY, y + k);
    for (let dx = 0; dx < k; dx++) for (let dy = 0; dy < k; dy++) cells.set(cellKey(x + dx, y + dy), i);
  }
  if (!isFinite(minX)) { minX = minY = 0; maxX = maxY = 1; }
  return { pos, size, labels, minX, minY, maxX, maxY, cells };
}

// ── Spectrum ─────────────────────────────────────────────────────────────────
/**
 * Hue runs left to right and lightness top to bottom, so the library becomes one continuous field of
 * color. Black and white covers get a block of their own, and covers not read yet wait at the end.
 */
function spectrum(albums: Album[], aspect: number): Layout {
  const pos = new Float32Array(albums.length * 2);
  const rows = Math.max(1, Math.round(Math.sqrt(albums.length / aspect)));
  const colored: { i: number; h: number; l: number }[] = [];
  const gray: { i: number; l: number }[] = [];
  const unread: number[] = [];
  albums.forEach((album, i) => {
    const s = albumSample(album);
    if (!s) unread.push(i);
    else if (s.c < GRAY_CHROMA) gray.push({ i, l: s.l });
    else colored.push({ i, h: s.h, l: s.l });
  });

  // Start the wheel at its emptiest hue, so similar colors never get split across the two ends.
  colored.sort((a, b) => a.h - b.h);
  if (colored.length > 1) {
    let gapAt = 0;
    let gap = colored[0].h + 360 - colored[colored.length - 1].h;
    for (let k = 1; k < colored.length; k++) {
      const g = colored[k].h - colored[k - 1].h;
      if (g > gap) { gap = g; gapAt = k; }
    }
    colored.push(...colored.splice(0, gapAt));
  }

  const labels: Label[] = [];
  let x = 0;
  const place = (list: { i: number; l: number }[]) => {
    for (let k = 0; k < list.length; k += rows) {
      const column = list.slice(k, k + rows).sort((a, b) => b.l - a.l);
      column.forEach((item, row) => { pos[2 * item.i] = x; pos[2 * item.i + 1] = row; });
      x++;
    }
  };
  place(colored);
  if (gray.length) {
    if (x) x += 2;
    labels.push({ x, y: -0.9, text: 'MONOCHROME', size: 0.45, align: 'left', major: true });
    place(gray);
  }
  if (unread.length) {
    if (x) x += 2;
    labels.push({ x, y: -0.9, text: 'READING COLORS', size: 0.45, align: 'left', major: true });
    place(unread.map(i => ({ i, l: 0 })));
  }
  return finish(pos, labels);
}

// ── Skylines ─────────────────────────────────────────────────────────────────
interface Group {
  label: string;
  items: number[];
  /** A heading over a run of groups, such as a decade. */
  major?: string;
  /** Empty cells before the group. */
  gap: number;
  /** Takes a column even when empty, so a year with no albums still shows as a gap in time. */
  keep?: boolean;
}

/** Each group becomes a block of columns standing on one baseline, as tall as the layout allows. */
function skyline(albumCount: number, groups: Group[], aspect: number, labelSize: number): Layout {
  const pos = new Float32Array(albumCount * 2);
  const colsOf = (g: Group, h: number) => Math.max(g.keep ? 1 : 0, Math.ceil(g.items.length / h));
  const widthAt = (h: number) => groups.reduce((w, g, k) => w + colsOf(g, h) + (k ? g.gap : 0), 0);
  let height = 1;
  let best = Infinity;
  const tallest = Math.max(1, ...groups.map(g => g.items.length));
  for (let h = 1; h <= tallest; h++) {
    const miss = Math.abs(Math.log(widthAt(h) / h / aspect));
    if (miss < best) { best = miss; height = h; }
  }

  const labels: Label[] = [];
  const majors: Label[] = [];
  let x = 0;
  groups.forEach((group, k) => {
    if (k) x += group.gap;
    const cols = colsOf(group, height);
    group.items.forEach((i, n) => {
      pos[2 * i] = x + Math.floor(n / height);
      pos[2 * i + 1] = -1 - (n % height);
    });
    if (group.major) majors.push({ x, y: 0.95, text: group.major, size: 0, align: 'left', major: true });
    if (group.items.length) labels.push({ x: x + cols / 2, y: 0.25, text: group.label, size: labelSize, align: 'center', major: false });
    x += cols;
  });
  // Each heading as large as the run of columns under it allows, so neighbors never collide.
  majors.forEach((label, k) => {
    const span = (majors[k + 1]?.x ?? x) - label.x - 0.6;
    label.size = Math.max(0.7, Math.min(height / 6, span / (label.text.length * 0.62)));
  });
  return finish(pos, [...labels, ...majors]);
}

function timeline(albums: Album[], aspect: number): Layout {
  const byYear = new Map<number, number[]>();
  const undated: number[] = [];
  albums.forEach((a, i) => {
    if (a.year && a.year > 1000) {
      const list = byYear.get(a.year) ?? [];
      list.push(i);
      byYear.set(a.year, list);
    } else {
      undated.push(i);
    }
  });
  const years = [...byYear.keys()].sort((a, b) => a - b);
  const groups: Group[] = [];
  const names = albums.map(a => sortName(a.artist));
  const byArtist = (x: number, y: number) => (names[x] < names[y] ? -1 : names[x] > names[y] ? 1 : 0);
  let decade = -1;
  if (years.length) {
    // Every year in the range, empty ones too, so gaps in the timeline are true to time.
    for (let y = years[0]; y <= years[years.length - 1]; y++) {
      const items = (byYear.get(y) ?? []).sort(byArtist);
      const d = Math.floor(y / 10) * 10;
      const major = d !== decade ? `${d}s` : undefined;
      decade = d;
      // Years of a decade stand shoulder to shoulder; decades get a gap between them.
      groups.push({ label: String(y), items, major, gap: major ? 1 : 0, keep: true });
    }
  }
  if (undated.length) groups.push({ label: 'undated', items: undated.sort(byArtist), major: 'Undated', gap: 2 });
  return skyline(albums.length, groups, aspect, 0.3);
}

function alphabet(albums: Album[], aspect: number): Layout {
  const byLetter = new Map<string, number[]>();
  // Folded once up front: sorting thousands of albums would otherwise fold each name thousands of times.
  const names = albums.map(a => sortName(a.artist));
  albums.forEach((_, i) => {
    const first = names[i].charAt(0).toUpperCase();
    const letter = /[A-Z]/.test(first) ? first : '#';
    const list = byLetter.get(letter) ?? [];
    list.push(i);
    byLetter.set(letter, list);
  });
  const letters = [...byLetter.keys()].sort((a, b) => (a === '#' ? -1 : b === '#' ? 1 : a.localeCompare(b)));
  const groups = letters.map(letter => ({
    label: letter,
    gap: 1,
    items: byLetter.get(letter)!.sort((x, y) =>
      (names[x] < names[y] ? -1 : names[x] > names[y] ? 1 : 0) || (albums[x].year ?? 0) - (albums[y].year ?? 0)),
  }));
  return skyline(albums.length, groups, aspect, 0.8);
}

// ── Rings ────────────────────────────────────────────────────────────────────
/**
 * The library as tree rings. The newest albums bloom large at the heart, and the rest grow outward in
 * round rings, one for each stretch of time they were added in, with a dark ring between. Around each
 * ring the covers run by hue, so the whole reads as a color wheel crossed by time.
 */
const DAY = 86_400_000;

/** Which stretch of time an album was added in: recent ones by how recent, older ones by year. */
function addedBand(created: string | undefined, now: number): { key: string; label: string } {
  const t = created ? Date.parse(created) : NaN;
  if (!Number.isFinite(t)) return { key: 'undated', label: 'UNDATED' };
  const age = now - t;
  if (age <= 7 * DAY) return { key: 'week', label: 'THIS WEEK' };
  if (age <= 31 * DAY) return { key: 'month', label: 'PAST MONTH' };
  if (age <= 92 * DAY) return { key: 'season', label: 'PAST 3 MONTHS' };
  if (age <= 365 * DAY) return { key: 'year', label: 'PAST YEAR' };
  const year = String(new Date(t).getFullYear());
  return { key: year, label: year };
}

/** A cell, by its top left corner. The rings are centered on the grid corner at 0, 0. */
interface Cell { x: number; y: number; ring: number; angle: number }

/** Clockwise from 12 o'clock, 0 to 1. */
const clockAngle = (x: number, y: number) => {
  const a = Math.atan2(x, -y) / (2 * Math.PI);
  return a < 0 ? a + 1 : a;
};

/** The cells whose centers round to this distance from the center, clockwise from 12 o'clock. */
function ringCells(ring: number): Cell[] {
  const out: Cell[] = [];
  for (let x = -ring - 1; x <= ring; x++) {
    for (let y = -ring - 1; y <= ring; y++) {
      const cx = x + 0.5, cy = y + 0.5;
      if (Math.round(Math.hypot(cx, cy)) === ring) out.push({ x, y, ring, angle: clockAngle(cx, cy) });
    }
  }
  return out.sort((a, b) => a.angle - b.angle);
}

/**
 * The heart: the newest album four cells wide, and the next eight two wide around it, leaving the
 * corners open so it reads round. A small library gets a smaller heart, so it isn't all heart.
 */
function heartTiles(n: number): { x: number; y: number; k: number }[] {
  if (n < 8) return [];
  if (n < 40) return [{ x: -1, y: -1, k: 2 }];
  return [
    { x: -2, y: -2, k: 4 },
    // Clockwise from 12 o'clock.
    { x: 0, y: -4, k: 2 }, { x: 2, y: -2, k: 2 }, { x: 2, y: 0, k: 2 }, { x: 0, y: 2, k: 2 },
    { x: -2, y: 2, k: 2 }, { x: -4, y: 0, k: 2 }, { x: -4, y: -2, k: 2 }, { x: -2, y: -4, k: 2 },
  ];
}

interface Band { label: string; items: number[]; years: number[]; recent: boolean }

/** What to call bands merged into one: the oldest recent stretch, a run of years, or since a year. */
function mergedLabel(bands: Band[]): string {
  const years = bands.flatMap(b => b.years);
  if (!years.length) return bands[bands.length - 1].label;
  const lo = Math.min(...years), hi = Math.max(...years);
  if (bands.some(b => b.recent)) return `SINCE ${lo}`;
  return lo === hi ? String(lo) : `${lo}–${hi}`;
}

function rings(albums: Album[]): Layout {
  const n = albums.length;
  const pos = new Float32Array(n * 2);
  const size = new Uint8Array(n).fill(1);
  const labels: Label[] = [];
  const taken = new Set<number>();

  // The album list comes newest first, so the heart is its head.
  const heart = heartTiles(n);
  let reach = -1;
  heart.forEach(({ x, y, k }, i) => {
    pos[2 * i] = x; pos[2 * i + 1] = y; size[i] = k;
    for (let dx = 0; dx < k; dx++) for (let dy = 0; dy < k; dy++) {
      taken.add(cellKey(x + dx, y + dy));
      reach = Math.max(reach, Math.round(Math.hypot(x + dx + 0.5, y + dy + 0.5)));
    }
  });

  // Everyone else, grouped by when they were added. Newest first, and undated ones outside.
  const now = Date.now();
  let bands: Band[] = [];
  const byKey = new Map<string, Band>();
  for (let i = heart.length; i < n; i++) {
    const { key, label } = addedBand(albums[i].created, now);
    let band = byKey.get(key);
    if (!band) {
      const year = Number(key);
      band = { label, items: [], years: Number.isFinite(year) ? [year] : [], recent: !Number.isFinite(year) && key !== 'undated' };
      byKey.set(key, band);
      bands.push(band);
    }
    band.items.push(i);
  }
  bands.sort((a, b) => (a.label === 'UNDATED' ? 1 : 0) - (b.label === 'UNDATED' ? 1 : 0));

  const freeCells = (ring: number) => ringCells(ring).filter(c => !taken.has(cellKey(c.x, c.y)));
  const hueOf = (i: number) => {
    const s = albumSample(albums[i]);
    if (!s) return 3;
    // Black and white covers, then ones not read yet, close the circle just before 12 o'clock.
    if (s.c < GRAY_CHROMA) return 2 - s.l;
    return ((s.h + 360 - HUE_START) % 360) / 360;
  };

  let ring = reach >= 0 ? reach + 2 : 0;
  // A band too small to go once around would be a stray arc, so it joins the next one out.
  const merged: Band[] = [];
  let pending: Band[] = [];
  let at = ring;
  for (const [k, band] of bands.entries()) {
    pending.push(band);
    const count = pending.reduce((sum, b) => sum + b.items.length, 0);
    const next = bands[k + 1];
    if (next && next.label !== 'UNDATED' && count < freeCells(at).length) continue;
    merged.push(pending.length === 1 ? band : {
      label: mergedLabel(pending), items: pending.flatMap(b => b.items), years: [], recent: false,
    });
    // Roughly where the next band will start, for judging whether it goes once around.
    let left = count;
    while (left > 0) left -= freeCells(at++).length;
    at++;
    pending = [];
  }
  bands = merged;

  for (const band of bands) {
    // Whole rings from the inside out. The last ring is spread evenly all the way around,
    // so every band closes into a circle.
    const cells: Cell[] = [];
    const first = ring;
    while (cells.length < band.items.length) {
      const ringFree = freeCells(ring);
      const need = band.items.length - cells.length;
      if (need >= ringFree.length) cells.push(...ringFree);
      else for (let j = 0; j < need; j++) cells.push(ringFree[Math.floor(((j + 0.5) * ringFree.length) / need)]);
      ring++;
    }
    // Hue around the ring: cells by angle, covers by hue, matched in order.
    cells.sort((a, b) => a.angle - b.angle || a.ring - b.ring);
    const order = [...band.items].sort((a, b) => hueOf(a) - hueOf(b));
    order.forEach((i, k) => {
      pos[2 * i] = cells[k].x;
      pos[2 * i + 1] = cells[k].y;
      taken.add(cellKey(cells[k].x, cells[k].y));
    });
    // The band's name in the dark ring just inside it, at 12 o'clock.
    if (first > 0 && bands.length > 1) {
      const top = ringCells(first - 1)[0];
      const textSize = Math.min(0.46, 0.12 * first);
      labels.push({ x: 0, y: top.y + 0.5 - textSize / 2, text: band.label, size: textSize, align: 'center', major: true });
    }
    // A dark ring before the next band.
    ring++;
  }
  return finish(pos, labels, size);
}

/** Where the color wheel starts at 12 o'clock: a red, so warm colors run down the right side. */
const HUE_START = 20;
