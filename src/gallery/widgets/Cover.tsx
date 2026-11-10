import { useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { coverUrl, getSample } from '../art';
import { openFrom } from '../router';

/** A cover's 3×3 color grid as nine crisp squares: what a cover looks like before it loads. */
export function Mosaic({ grid, className }: { grid?: string[]; className?: string }) {
  if (!grid) return <div className={`g-mosaic is-empty ${className ?? ''}`} />;
  return (
    <svg className={`g-mosaic ${className ?? ''}`} viewBox="0 0 3 3" preserveAspectRatio="none" shapeRendering="crispEdges" aria-hidden="true">
      {grid.map((hex, i) => <rect key={i} x={i % 3} y={Math.floor(i / 3)} width="1.02" height="1.02" fill={`#${hex}`} />)}
    </svg>
  );
}

interface CoverProps {
  coverArt?: string;
  size: number;
  alt?: string;
  className?: string;
  eager?: boolean;
  /** An image URL to use instead of server cover art, such as an artist photo. */
  src?: string;
  /** A smaller size that's likely cached already, shown while the sharp one loads. */
  placeholderSize?: number;
}

/** Square art that resolves from its color grid, so nothing is ever a blank box. */
export function Cover({ coverArt, size, alt = '', className, eager, src, placeholderSize }: CoverProps) {
  const url = src ?? (coverArt ? coverUrl(coverArt, size) : '');
  const sample = getSample(coverArt);
  return (
    <div className={`g-cover ${className ?? ''}`}>
      <Mosaic grid={sample?.grid} />
      {placeholderSize && coverArt && !src && <img className="g-cover-under" src={coverUrl(coverArt, placeholderSize)} alt="" aria-hidden="true" />}
      {url && <CoverImage key={url} url={url} alt={alt} eager={eager} />}
    </div>
  );
}

/** Keyed by URL, so a new cover starts hidden and fades in over its grid again. */
function CoverImage({ url, alt, eager }: { url: string; alt: string; eager?: boolean }) {
  const [state, setState] = useState<'loading' | 'loaded' | 'failed'>('loading');
  if (state === 'failed') return null;
  return (
    <img
      src={url}
      alt={alt}
      loading={eager ? 'eager' : 'lazy'}
      decoding="async"
      draggable={false}
      className={state === 'loaded' ? 'is-loaded' : ''}
      onLoad={() => setState('loaded')}
      onError={() => setState('failed')}
    />
  );
}

interface CardProps {
  coverArt?: string;
  title: string;
  subtitle?: ReactNode;
  path: string;
  size?: number;
  src?: string;
  className?: string;
  /** Shown on the art's corner on hover, such as a play button. */
  action?: ReactNode;
}

/** A cover with its caption below. Clicking it flies the cover into the next view. */
export function CoverCard({ coverArt, title, subtitle, path, size = 400, src, className, action }: CardProps) {
  const artRef = useRef<HTMLDivElement>(null);
  const sample = getSample(coverArt);
  const style = sample ? ({ '--glow': `#${sample.grid[4]}` } as CSSProperties) : undefined;
  return (
    <div className={`g-card ${className ?? ''}`} style={style}>
      <button className="g-card-hit" onClick={() => openFrom(artRef.current, coverArt, path)} aria-label={title}>
        <div ref={artRef} className="g-card-art">
          <Cover coverArt={coverArt} size={size} src={src} />
        </div>
        <span className="g-card-title">{title}</span>
        {subtitle && <span className="g-card-sub">{subtitle}</span>}
      </button>
      {action && <div className="g-card-action">{action}</div>}
    </div>
  );
}

/** A few bars that bounce while music plays: marks the playing track without a word. */
export function LiveBars({ playing }: { playing: boolean }) {
  return (
    <span className={`g-bars${playing ? '' : ' is-paused'}`} aria-hidden="true">
      <i /><i /><i /><i />
    </span>
  );
}
