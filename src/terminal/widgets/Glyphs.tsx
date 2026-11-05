import { useEffect, useState } from 'react';
import { reducedMotion } from '../motion';

/**
 * The few symbols that carry meaning for a screen reader. They're plain ASCII, which every monospace
 * font draws at exactly one cell wide, so they can't break the grid.
 */
export const Star = () => <span role="img" aria-label="starred">*</span>;

/** Marks the current track. */
export const PlaybackMark = ({ playing }: { playing: boolean }) => (
  <span role="img" aria-label={playing ? 'playing' : 'paused'}>{playing ? '>' : '||'}</span>
);

const SPINNER_FRAMES = '|/-\\';
const SPINNER_MS = 120;

/** The classic spinner, for work in progress. Holds still under reduced motion. */
export function Spinner() {
  const [frame, setFrame] = useState(0);
  useEffect(() => {
    if (reducedMotion()) return;
    const timer = setInterval(() => setFrame(f => (f + 1) % SPINNER_FRAMES.length), SPINNER_MS);
    return () => clearInterval(timer);
  }, []);
  return <span aria-hidden="true">{SPINNER_FRAMES[frame]}</span>;
}
