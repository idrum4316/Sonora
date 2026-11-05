import type { ReactNode } from 'react';

/**
 * Small drawn symbols. The terminal font lacks most of these, and fallback fonts draw them at
 * unpredictable widths that clip or misalign in a character grid.
 */
function Icon({ label, children }: { label?: string; children: ReactNode }) {
  return (
    <svg className="t-icon" viewBox="0 0 16 16" fill="currentColor" role={label ? 'img' : undefined} aria-label={label} aria-hidden={label ? undefined : true}>
      {children}
    </svg>
  );
}

export const PlayIcon = () => <Icon><path d="M4.6 2.5a.7.7 0 0 1 1.05-.6l8 5.5a.7.7 0 0 1 0 1.2l-8 5.5a.7.7 0 0 1-1.05-.6z" /></Icon>;
export const PauseIcon = () => <Icon><rect x="3.6" y="2.4" width="3.1" height="11.2" rx="1" /><rect x="9.3" y="2.4" width="3.1" height="11.2" rx="1" /></Icon>;
export const PrevIcon = () => <Icon><rect x="2.6" y="3" width="1.9" height="10" rx=".8" /><path d="M13 3.6a.6.6 0 0 0-.94-.5L5.7 7.5a.6.6 0 0 0 0 1l6.36 4.4a.6.6 0 0 0 .94-.5z" /></Icon>;
export const NextIcon = () => <Icon><rect x="11.5" y="3" width="1.9" height="10" rx=".8" /><path d="M3 3.6a.6.6 0 0 1 .94-.5l6.36 4.4a.6.6 0 0 1 0 1L3.94 12.9A.6.6 0 0 1 3 12.4z" /></Icon>;
export const ChevronIcon = () => <Icon><path d="M6 3.6 10.4 8 6 12.4" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /></Icon>;
export const RecentIcon = () => (
  <Icon>
    <path d="M3.2 8a4.8 4.8 0 1 0 1.5-3.5" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    <path d="M4.6 2.2v2.5h2.5M8 5.4V8l1.8 1.2" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
  </Icon>
);

const STAR = 'M8 1.6l1.95 4.1 4.45.6-3.25 3.1.8 4.45L8 11.7l-3.95 2.15.8-4.45L1.6 6.3l4.45-.6z';
export const StarIcon = ({ filled, label }: { filled: boolean; label?: string }) => (
  <Icon label={label}>
    <path d={STAR} fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={filled ? 0.8 : 1.2} strokeLinejoin="round" />
  </Icon>
);

/** The mark from the favicon, for wherever the name of the app goes. */
export const BrandMark = () => (
  <svg className="t-brand-mark" viewBox="0 0 28 28" fill="none" aria-hidden="true">
    <circle cx="14" cy="14" r="12" stroke="currentColor" strokeWidth="2" />
    <path d="M9 18 Q14 8 19 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    <circle cx="14" cy="14" r="2.8" fill="currentColor" />
  </svg>
);

/** Three bars that bounce while the track plays and rest when it's paused. */
export const EqBars = ({ playing }: { playing: boolean }) => (
  <span className={`t-bars${playing ? ' is-playing' : ''}`} role="img" aria-label={playing ? 'playing' : 'paused'}>
    <i /><i /><i />
  </span>
);
