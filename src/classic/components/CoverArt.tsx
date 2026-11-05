import { useState, memo, useMemo } from 'react';
import { useStore } from '../../core/store';
import { getCoverArtUrl } from '../../core/subsonic';

const ART_CLASSES = [
  'art-violet', 'art-ocean', 'art-forest', 'art-garnet',
  'art-amber', 'art-rose', 'art-emerald', 'art-steel',
  'art-sunset', 'art-lavender', 'art-terracotta', 'art-night',
];

function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

interface CoverArtProps {
  coverArt?: string;
  id?: string;
  size?: number;
  className?: string;
  style?: React.CSSProperties;
  alt?: string;
}

export const CoverArt = memo(function CoverArt({ coverArt, id = '', size = 300, className = '', style, alt = '' }: CoverArtProps) {
  const config = useStore(s => s.config);
  const [failed, setFailed] = useState(false);
  const artClass = ART_CLASSES[hashStr(id || coverArt || 'x') % ART_CLASSES.length];

  const src = useMemo(
    () => (config && coverArt ? getCoverArtUrl(config, coverArt, size) : undefined),
    [config, coverArt, size],
  );

  if (!coverArt || failed || !config || !src) {
    return <div className={`${artClass} ${className}`} style={style} aria-hidden={!alt || undefined} />;
  }

  return (
    <img
      src={src}
      alt={alt}
      className={className}
      style={{ objectFit: 'cover', width: '100%', height: '100%', ...style }}
      onError={() => setFailed(true)}
      loading="lazy"
    />
  );
});

export function artClass(id: string): string {
  return ART_CLASSES[hashStr(id) % ART_CLASSES.length];
}
