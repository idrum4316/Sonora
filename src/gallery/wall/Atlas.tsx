import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { useStore } from '../../core/store';
import type { Album } from '../../core/subsonic';
import { getSample, paletteOf, pendingSamples, preload, useSamples } from '../art';
import { arrange } from '../layouts';
import {
  albumAtlasId, albumSample, ARRANGEMENTS, countsPlays, LISTENING_ARRANGEMENTS, listeningLine, litMask, useGallery,
} from '../library';
import { albumPath, artistPath, go, launch } from '../router';
import { Mosaic } from '../widgets/Cover';
import { FitIcon, MinusIcon, PlayIcon, PlusIcon, TargetIcon } from '../widgets/Icons';
import { tileRadius, WallEngine } from './engine';

/** Lets the top bar steer the atlas: jump to a search result, frame everything. */
export const atlasApi = {
  focusFirstLit: () => {},
  fit: () => {},
};

/** Arrangements that sort by color, so they re-sort as covers are read. */
const COLOR_SORTED = ['spectrum', 'rings', 'heat'];

/** How often a color sort re-sorts while covers are still being read. */
const RESORT_MS = 2600;

export function Atlas({ active }: { active: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<WallEngine | null>(null);
  const hoverRef = useRef<HTMLDivElement>(null);
  const beaconRef = useRef<HTMLDivElement>(null);
  const tourRef = useRef<HTMLDivElement>(null);

  const albums = useGallery(s => s.albums);
  const status = useGallery(s => s.status);
  const arrangement = useGallery(s => s.arrangement);
  const query = useGallery(s => s.query);
  const starredOnly = useGallery(s => s.starredOnly);
  const unheardOnly = useGallery(s => s.unheardOnly);
  const genre = useGallery(s => s.genre);
  const touring = useGallery(s => s.touring);
  const locateTick = useGallery(s => s.locateTick);
  const sampleVersion = useSamples(s => s.version);
  const blocked = useSamples(s => s.blocked);
  const playingAlbumId = useStore(s => s.currentTrack?.albumId);

  const [hover, setHover] = useState(-1);
  const [tourIndex, setTourIndex] = useState(-1);
  const [count, setCount] = useState({ pending: 0 });

  // Things the per-frame callback reads without re-rendering.
  const live = useRef({ albums, hover, tourIndex, playingIndex: -1 });
  live.current.albums = albums;
  live.current.hover = hover;
  live.current.tourIndex = tourIndex;
  const playingIndex = useMemo(() => albums.findIndex(a => a.id === playingAlbumId), [albums, playingAlbumId]);
  live.current.playingIndex = playingIndex;

  // ── Engine ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    const engine = new WallEngine(canvasRef.current!);
    engineRef.current = engine;
    engine.onHover = i => {
      // The next frame places the card, which may come before React re-renders.
      live.current.hover = i;
      setHover(i);
    };
    engine.onUserMove = () => {
      if (useGallery.getState().touring) useGallery.getState().setTouring(false);
    };
    engine.onOpen = (i, rect) => {
      const album = live.current.albums[i];
      if (!album) return;
      launch({ coverArt: album.coverArt, rect });
      go(albumPath(album.id));
    };
    engine.onFrame = () => placeOverlays(engine);
    return () => engine.dispose();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** Pins the hover card, the now-playing beacon and the tour card to their tiles. */
  function placeOverlays(engine: WallEngine) {
    const { hover, playingIndex, tourIndex } = live.current;
    const card = hoverRef.current;
    if (card) {
      const r = engine.tileRect(hover);
      if (r && hover !== tourIndex) {
        const below = r.top + r.height * 1.07 + 10;
        const flip = below + 70 > engine.h - engine.insets.bottom + 40;
        card.style.transform = `translate(${Math.round(r.left + r.width / 2)}px, ${Math.round(flip ? r.top - r.height * 0.07 - 10 : below)}px) translate(-50%, ${flip ? '-100%' : '0'})`;
        card.classList.add('is-shown');
      } else {
        card.classList.remove('is-shown');
      }
    }
    const beacon = beaconRef.current;
    if (beacon) {
      const r = engine.tileRect(playingIndex);
      const on = r && r.width > 6 && r.left < engine.w && r.top < engine.h && r.left + r.width > 0 && r.top + r.height > 0;
      if (on) {
        beacon.style.transform = `translate(${r.left}px, ${r.top}px)`;
        beacon.style.width = beacon.style.height = `${r.width}px`;
        beacon.style.borderRadius = `${tileRadius(r.width)}px`;
      }
      beacon.classList.toggle('is-shown', !!on);
    }
    const tour = tourRef.current;
    if (tour) {
      const r = engine.tileRect(tourIndex);
      if (r) {
        tour.style.transform = `translate(${Math.round(r.left + r.width + 40)}px, ${Math.round(r.top + r.height / 2)}px) translateY(-50%)`;
      }
      tour.classList.toggle('is-shown', !!r && !engine.flying);
    }
  }

  // ── Tiles and layout ────────────────────────────────────────────────────────
  useEffect(() => {
    engineRef.current?.setTiles(albums.map(a => {
      const s = albumSample(a);
      return { coverArt: a.coverArt, atlasId: albumAtlasId(a), glow: s ? paletteOf(s).accent : undefined };
    }));
    engineRef.current?.requestDraw();
  }, [albums, sampleVersion]);

  const lastResort = useRef(0);
  const laidOut = useRef<{ arrangement: string; library: string } | null>(null);
  // Which albums, not which array: starring one makes a new array of the same library.
  const libraryKey = albums.length ? `${albums.length}:${albums[0].id}:${albums[albums.length - 1].id}` : '';
  useEffect(() => {
    const engine = engineRef.current;
    if (!engine || !albums.length) return;
    const aspect = Math.max(1, (engine.w - 64) / Math.max(1, engine.h - 228));
    const first = !laidOut.current || laidOut.current.library !== libraryKey;
    const changed = first || laidOut.current!.arrangement !== arrangement;
    if (!changed) return;
    laidOut.current = { arrangement, library: libraryKey };
    lastResort.current = performance.now();
    engine.setLayout(arrange(arrangement, albums, aspect), true);
    engine.fit(!first);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [libraryKey, arrangement]);

  // A color sort keeps re-sorting as covers are read, so the wall visibly sorts itself.
  useEffect(() => {
    if (!COLOR_SORTED.includes(arrangement) || !albums.length) return;
    const engine = engineRef.current!;
    const run = () => {
      // Tiles shouldn't slide out from under someone exploring; they get one final sort when reading ends.
      const moved = engine.cameraMoved || useGallery.getState().touring;
      if (moved && pendingSamples() > 0) return;
      lastResort.current = performance.now();
      const aspect = Math.max(1, (engine.w - 64) / Math.max(1, engine.h - 228));
      const layout = arrange(arrangement, albums, aspect);
      const now = engine.layout?.pos;
      if (now && now.length === layout.pos.length && now.every((v, i) => v === layout.pos[i])) return;
      engine.setLayout(layout, true);
      if (!moved) engine.fit(true);
    };
    const wait = RESORT_MS - (performance.now() - lastResort.current);
    const timer = window.setTimeout(run, Math.max(0, wait));
    return () => clearTimeout(timer);
  }, [sampleVersion, arrangement, albums]);

  useEffect(() => {
    const tick = () => setCount({ pending: pendingSamples() });
    tick();
    const timer = window.setInterval(tick, 700);
    return () => clearInterval(timer);
  }, []);

  // ── Lit tiles ───────────────────────────────────────────────────────────────
  const mask = useMemo(
    () => litMask(albums, query, starredOnly, genre, unheardOnly),
    [albums, query, starredOnly, genre, unheardOnly],
  );
  const litCount = useMemo(() => (mask ? mask.reduce((n, v) => n + v, 0) : albums.length), [mask, albums]);
  useEffect(() => { engineRef.current?.setLit(mask); }, [mask]);

  useEffect(() => {
    atlasApi.focusFirstLit = () => {
      const i = mask ? mask.indexOf(1) : -1;
      if (i >= 0) engineRef.current?.focus(i, { zoom: Math.min(window.innerWidth, window.innerHeight) * 0.3 });
    };
    atlasApi.fit = () => engineRef.current?.fit();
  }, [mask]);

  useEffect(() => { engineRef.current?.setActive(active); }, [active]);

  // Move the beacon when the music moves on to another album, even with the atlas sitting still.
  useEffect(() => { engineRef.current?.requestDraw(); }, [playingIndex]);

  useEffect(() => {
    if (locateTick && playingIndex >= 0) engineRef.current?.focus(playingIndex);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locateTick]);

  // ── Tour ────────────────────────────────────────────────────────────────────
  useEffect(() => {
    const engine = engineRef.current;
    if (!touring || !active || !engine || !albums.length) {
      setTourIndex(-1);
      return;
    }
    let timer = 0;
    let last = -1;
    const pick = () => {
      const lit: number[] = [];
      for (let i = 0; i < albums.length; i++) if (engine.isLit(i) && albums[i].coverArt && i !== last) lit.push(i);
      return lit.length ? lit[Math.floor(Math.random() * lit.length)] : -1;
    };
    let next = pick();
    const visit = () => {
      const i = next;
      if (i < 0) return;
      last = i;
      setTourIndex(i);
      engine.setSpotlight(i);
      engine.focus(i, { zoom: Math.min(engine.w, engine.h) * 0.4, dur: 3600, offset: -0.12 });
      next = pick();
      preload(albums[next]?.coverArt, 800);
      timer = window.setTimeout(visit, 3600 + 5600);
    };
    visit();
    return () => {
      clearTimeout(timer);
      engine.setSpotlight(-1);
      setTourIndex(-1);
    };
  }, [touring, active, albums]);

  // ── Keys ────────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || (e.target as HTMLElement).closest('input, textarea, select, [role="slider"]')) return;
      const engine = engineRef.current;
      if (!engine) return;
      const step = Math.min(engine.w, engine.h) * 0.35;
      const keys: Record<string, () => void> = {
        ArrowLeft: () => engine.panBy(-step, 0),
        ArrowRight: () => engine.panBy(step, 0),
        ArrowUp: () => engine.panBy(0, -step),
        ArrowDown: () => engine.panBy(0, step),
        '+': () => engine.zoomBy(1.4),
        '=': () => engine.zoomBy(1.4),
        '-': () => engine.zoomBy(1 / 1.4),
        '0': () => engine.fit(),
        '1': () => useGallery.getState().setArrangement('spectrum'),
        '2': () => useGallery.getState().setArrangement('timeline'),
        '3': () => useGallery.getState().setArrangement('alphabet'),
        '4': () => useGallery.getState().setArrangement('rings'),
        '5': () => useGallery.getState().setArrangement('heat'),
        '6': () => useGallery.getState().setArrangement('played'),
        t: () => useGallery.getState().setTouring(!useGallery.getState().touring),
        l: () => useGallery.getState().locate(),
      };
      const run = keys[e.key];
      if (!run) return;
      e.preventDefault();
      if (e.key !== 't') useGallery.getState().setTouring(false);
      run();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [active]);

  const hovered = albums[hover];
  const toured = albums[tourIndex];
  const arrangementInfo = ARRANGEMENTS.find(a => a.id === arrangement)!;
  const listening = LISTENING_ARRANGEMENTS.includes(arrangement);
  const noCounts = useMemo(() => albums.length > 0 && !countsPlays(albums), [albums]);

  return (
    <section className={`g-atlas${active ? '' : ' is-hidden'}${touring ? ' is-touring' : ''}`} aria-label="Album atlas">
      <canvas ref={canvasRef} className="g-atlas-canvas" />
      <div ref={beaconRef} className="g-beacon" aria-hidden="true" />
      <div ref={hoverRef} className="g-hover" aria-hidden="true">
        {hovered && (
          <>
            <span className="g-hover-title">{hovered.name}</span>
            <span className="g-hover-sub">{hovered.artist}{hovered.year ? <span className="g-mono"> · {hovered.year}</span> : null}</span>
            {listening && !noCounts && <span className="g-hover-sub g-mono">{listeningLine(hovered)}</span>}
          </>
        )}
      </div>
      <div ref={tourRef} className="g-tour-card">
        {toured && <TourCard album={toured} />}
      </div>

      {status === 'loading' && <div className="g-atlas-status"><span className="g-spinner" />Gathering your library…</div>}
      {status === 'ready' && !albums.length && <div className="g-atlas-status">This library has no albums yet.</div>}

      <div className="g-hud">
        <div className="g-hud-info">
          <span className="g-hud-mode">{arrangementInfo.hint}</span>
          <span className="g-mono">
            {mask ? `${litCount.toLocaleString()} of ` : ''}{albums.length.toLocaleString()} albums
          </span>
          {arrangement === 'spectrum' && count.pending > 0 && !blocked && (
            <span className="g-mono g-hud-reading"><span className="g-spinner" />reading colors · {count.pending.toLocaleString()} left</span>
          )}
          {arrangement === 'spectrum' && blocked && (
            <span className="g-mono g-hud-reading">This server hides cover colors (no CORS), so Spectrum can't sort.</span>
          )}
          {(listening || unheardOnly) && noCounts && (
            <span className="g-mono g-hud-reading">This server doesn't count plays, so every album looks unplayed.</span>
          )}
        </div>
        <div className="g-hud-zoom">
          <button className="g-icon-btn" onClick={() => engineRef.current?.zoomBy(1 / 1.5)} title="Zoom out (−)"><MinusIcon size={18} /></button>
          <button className="g-icon-btn" onClick={() => engineRef.current?.fit()} title="See everything (0)"><FitIcon size={18} /></button>
          <button className="g-icon-btn" onClick={() => engineRef.current?.zoomBy(1.5)} title="Zoom in (+)"><PlusIcon size={18} /></button>
          {playingIndex >= 0 && (
            <button className="g-icon-btn" onClick={() => engineRef.current?.focus(playingIndex)} title="Find what's playing (l)"><TargetIcon size={18} /></button>
          )}
        </div>
      </div>
    </section>
  );
}

function TourCard({ album }: { album: Album }) {
  const sample = getSample(album.coverArt);
  const palette = paletteOf(sample);
  const playAlbum = useStore(s => s.playAlbum);
  return (
    <div className="g-tour-inner" style={{ '--p-accent': palette.accent } as CSSProperties}>
      <span className="g-eyebrow">Now touring</span>
      <button className="g-tour-title" onClick={() => go(albumPath(album.id))}>{album.name}</button>
      <button className="g-tour-artist" onClick={() => go(artistPath(album.artistId))}>{album.artist}</button>
      <span className="g-mono g-dim">{[album.year, album.genre].filter(Boolean).join(' · ')}</span>
      {sample && (
        <div className="g-tour-swatches">
          <Mosaic grid={sample.grid} className="g-tour-print" />
          {palette.swatches.map(c => <span key={c} className="g-mono"><i style={{ background: c }} />{c}</span>)}
        </div>
      )}
      <button className="g-pill is-accent" onClick={() => void playAlbum(album)}><PlayIcon size={16} /> Play album</button>
    </div>
  );
}
