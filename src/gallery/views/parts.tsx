import { useLayoutEffect, useRef, type ReactNode } from 'react';
import { fmt } from '../../core/format';
import { groupByDisc } from '../../core/library';
import { useStore } from '../../core/store';
import type { Song } from '../../core/subsonic';
import { coverUrl, type ArtSample, type Palette } from '../art';
import { reducedMotion } from '../motion';
import { albumPath, artistPath, go, land } from '../router';
import { pickForSong, useUi } from '../ui';
import { Cover, LiveBars, Mosaic } from '../widgets/Cover';
import { AddIcon, BackIcon, ForwardIcon, HeartIcon, NextUpIcon, PlayIcon, PlaylistAddIcon, PlaylistRemoveIcon } from '../widgets/Icons';

/**
 * A view's hero art. If it was opened from a cover, it starts where that cover was and flies into place,
 * glow and all. The glow is the art itself, blurred, as if the screen were lighting the room.
 */
interface HeroProps {
  coverArt?: string;
  src?: string;
  alt: string;
  /** The cover whose light the hero gives off, when it shows something else, such as a mosaic. */
  glowArt?: string;
  /** The cover a flight to this view would have left from, when the hero shows something else. */
  landing?: string;
  children?: ReactNode;
}

export function HeroArt({ coverArt, src, alt, glowArt, landing, children }: HeroProps) {
  const ref = useRef<HTMLDivElement>(null);
  const flown = useRef(false);
  const lightArt = coverArt ?? glowArt;
  const glowUrl = src ?? (lightArt ? coverUrl(lightArt, 400) : '');
  const target = landing ?? coverArt;

  // Checked again as the view's data arrives, since artists and playlists only know their cover then.
  useLayoutEffect(() => {
    const el = ref.current;
    if (flown.current || !el || reducedMotion()) return;
    const flight = land(target);
    if (!flight) return;
    const to = el.getBoundingClientRect();
    const from = flight.rect;
    if (!to.width) return;
    flown.current = true;
    const flying = el.animate(
      [
        { transform: `translate(${from.left - to.left}px, ${from.top - to.top}px) scale(${from.width / to.width})`, opacity: 0.9 },
        { transform: 'none', opacity: 1 },
      ],
      { duration: 760, easing: 'cubic-bezier(.2,.75,.12,1)' },
    );
    // Cancelled on cleanup, so a second run measures the hero where it rests, not mid-flight.
    return () => {
      flying.cancel();
      flown.current = false;
    };
  }, [target]);

  return (
    <div ref={ref} className="g-hero-art">
      {glowUrl && <div className="g-hero-glow" style={{ backgroundImage: `url("${glowUrl}")` }} aria-hidden="true" />}
      {/* Under the sharp cover, the size the atlas most likely has cached, so the flight never lands empty. */}
      <Cover coverArt={coverArt} src={src} size={1000} alt={alt} eager placeholderSize={400} />
      {children}
    </div>
  );
}

/** The art spread across the whole page as soft light, under everything. */
export function Wash({ coverArt, src }: { coverArt?: string; src?: string }) {
  const url = src ?? (coverArt ? coverUrl(coverArt, 400) : '');
  return (
    <div className="g-wash" aria-hidden="true">
      {url && <div className="g-wash-art" style={{ backgroundImage: `url("${url}")` }} />}
      <div className="g-wash-tint" />
    </div>
  );
}

/** The cover's color grid and its main colors, written out. */
export function Fingerprint({ sample, palette }: { sample: ArtSample | null; palette: Palette }) {
  if (!sample) return null;
  return (
    <div className="g-fingerprint">
      <Mosaic grid={sample.grid} className="g-fingerprint-grid" />
      <div className="g-fingerprint-swatches">
        {palette.swatches.map(c => (
          <span key={c} className="g-swatch"><i style={{ background: c }} /><span className="g-mono">{c}</span></span>
        ))}
      </div>
    </div>
  );
}

interface TrackListProps {
  songs: Song[];
  /** Shows each track's own cover and album, for lists that span albums. */
  mixed?: boolean;
  /** Offers to take a track out of the list, for playlists you can edit. Gets the track's position. */
  onRemove?: (song: Song, index: number) => void;
  /** Holds the remove buttons while a removal is under way, since positions shift once it lands. */
  removing?: boolean;
}

export function TrackList({ songs, mixed, onRemove, removing }: TrackListProps) {
  const currentId = useStore(s => s.currentTrack?.id);
  const isPlaying = useStore(s => s.isPlaying);
  const { playOrToggle, playNext, addToQueue } = useStore.getState();
  const showToast = useUi(s => s.showToast);
  const setSongStarred = useUi(s => s.setSongStarred);
  const starred = useUi(s => s.starred);
  const discs = mixed ? [{ number: 1, tracks: songs.map((song, index) => ({ song, index })) }] : groupByDisc(songs);

  return (
    <div className={`g-tracks${mixed ? ' is-mixed' : ''}`}>
      {discs.map(disc => (
        <div key={disc.number} className="g-disc">
          {discs.length > 1 && <h3 className="g-eyebrow g-disc-title">Disc {disc.number}</h3>}
          <ol>
            {disc.tracks.map(({ song, index }) => {
              const current = song.id === currentId;
              const isStarred = starred[song.id] ?? !!song.starred;
              return (
                <li key={`${song.id}-${index}`} className={`g-track${current ? ' is-current' : ''}`}>
                  <button className="g-track-hit" onClick={() => playOrToggle(song, songs, index)} aria-label={`Play ${song.title}`}>
                    <span className="g-track-n g-mono">
                      {current ? <LiveBars playing={isPlaying} /> : <span className="g-track-num">{String(mixed ? index + 1 : song.track ?? index + 1).padStart(2, '0')}</span>}
                      <PlayIcon size={14} className="g-track-play" />
                    </span>
                    {mixed && <Cover coverArt={song.coverArt} size={96} className="g-track-art" />}
                    <span className="g-track-text">
                      <span className="g-track-title">{song.title}</span>
                      {mixed && <span className="g-track-sub">{song.artist} · {song.album}</span>}
                    </span>
                  </button>
                  <span className="g-track-actions">
                    {mixed && (
                      <button className="g-icon-btn" onClick={() => go(albumPath(song.albumId))} title="Open album"><ForwardIcon size={15} /></button>
                    )}
                    <button className="g-icon-btn" onClick={() => { playNext(song); showToast(`Playing next: ${song.title}`); }} title="Play next"><NextUpIcon size={16} /></button>
                    <button className="g-icon-btn" onClick={() => { addToQueue(song); showToast(`Added to queue: ${song.title}`); }} title="Add to queue"><AddIcon size={16} /></button>
                    <button className="g-icon-btn" onClick={() => pickForSong(song)} title="Add to playlist" aria-haspopup="dialog"><PlaylistAddIcon size={16} /></button>
                    {onRemove && (
                      <button className="g-icon-btn" onClick={() => onRemove(song, index)} disabled={removing} title="Remove from playlist">
                        <PlaylistRemoveIcon size={16} />
                      </button>
                    )}
                    <button
                      className={`g-icon-btn${isStarred ? ' is-on' : ''}`}
                      title={isStarred ? 'Unfavorite' : 'Favorite'}
                      aria-pressed={isStarred}
                      onClick={() => setSongStarred(song.id, !isStarred)}
                    >
                      <HeartIcon size={15} filled={isStarred} />
                    </button>
                  </span>
                  <span className="g-track-time g-mono">{fmt(song.duration)}</span>
                </li>
              );
            })}
          </ol>
        </div>
      ))}
    </div>
  );
}

/** A row of covers that scrolls sideways. */
export function Shelf({ title, note, children }: { title: string; note?: string; children: ReactNode }) {
  const rowRef = useRef<HTMLDivElement>(null);
  const scroll = (dir: number) => {
    const row = rowRef.current;
    if (row) row.scrollBy({ left: dir * row.clientWidth * 0.8, behavior: reducedMotion() ? 'auto' : 'smooth' });
  };
  return (
    <section className="g-shelf">
      <header className="g-shelf-head">
        <h2 className="g-section-title">{title}</h2>
        {note && <span className="g-shelf-note">{note}</span>}
        <span className="g-shelf-nav">
          <button className="g-icon-btn" onClick={() => scroll(-1)} aria-label="Scroll left"><BackIcon size={18} /></button>
          <button className="g-icon-btn" onClick={() => scroll(1)} aria-label="Scroll right"><ForwardIcon size={18} /></button>
        </span>
      </header>
      <div className="g-shelf-row" ref={rowRef}>{children}</div>
    </section>
  );
}

export function ArtistLink({ id, name }: { id?: string; name: string }) {
  if (!id) return <span className="g-artist-link">{name}</span>;
  return <button className="g-artist-link" onClick={() => go(artistPath(id))}>{name}</button>;
}

/** The display heading's class, smaller for long titles so they still fit beside the art. */
export function displayClass(title: string | undefined): string {
  const n = title?.length ?? 0;
  return `g-display${n > 48 ? ' is-xlong' : n > 22 ? ' is-long' : ''}`;
}

/** Fisher–Yates, for shuffle play. */
export function shuffled<T>(items: T[]): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}
