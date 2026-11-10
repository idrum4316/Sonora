import type { SVGProps } from 'react';

/** A small, consistent icon set: 24-unit grid, square ends, drawn rather than borrowed. */
type IconProps = SVGProps<SVGSVGElement> & { size?: number };

function Svg({ size = 20, children, ...rest }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false" {...rest}>
      {children}
    </svg>
  );
}

export const PlayIcon = (p: IconProps) => <Svg {...p}><path d="M7 4.5v15l12.5-7.5z" fill="currentColor" stroke="none" /></Svg>;
export const PauseIcon = (p: IconProps) => <Svg {...p}><rect x="6" y="4.5" width="4" height="15" rx="1" fill="currentColor" stroke="none" /><rect x="14" y="4.5" width="4" height="15" rx="1" fill="currentColor" stroke="none" /></Svg>;
export const NextIcon = (p: IconProps) => <Svg {...p}><path d="M5 5.5v13l10-6.5z" fill="currentColor" stroke="none" /><path d="M18.5 5.5v13" strokeWidth={2.2} /></Svg>;
export const PrevIcon = (p: IconProps) => <Svg {...p}><path d="M19 5.5v13L9 12z" fill="currentColor" stroke="none" /><path d="M5.5 5.5v13" strokeWidth={2.2} /></Svg>;
export const ShuffleIcon = (p: IconProps) => <Svg {...p}><path d="M3.5 7h3.2c2 0 3.2 1 4.3 2.6l2 3c1.1 1.6 2.3 2.4 4.3 2.4h3.2M3.5 17h3.2c1.5 0 2.5-.5 3.4-1.4M13.6 8.4C14.5 7.5 15.5 7 17 7h3.2M17.5 4.5 20.2 7l-2.7 2.5M17.5 14.5l2.7 2.5-2.7 2.5" /></Svg>;
export const RepeatIcon = ({ one, ...p }: IconProps & { one?: boolean }) => (
  <Svg {...p}>
    <path d="M4 11V9.5A3.5 3.5 0 0 1 7.5 6H19m0 0-3-3m3 3-3 3M20 13v1.5a3.5 3.5 0 0 1-3.5 3.5H5m0 0 3 3m-3-3 3-3" />
    {one && <text x="12" y="14.6" fontSize="7.5" fontWeight="700" textAnchor="middle" fill="currentColor" stroke="none" fontFamily="Geist Mono, monospace">1</text>}
  </Svg>
);
export const HeartIcon = ({ filled, ...p }: IconProps & { filled?: boolean }) => (
  <Svg {...p}><path d="M12 20s-7.5-4.6-7.5-10.2A4.3 4.3 0 0 1 12 7.2a4.3 4.3 0 0 1 7.5 2.6C19.5 15.4 12 20 12 20z" fill={filled ? 'currentColor' : 'none'} /></Svg>
);
export const SearchIcon = (p: IconProps) => <Svg {...p}><circle cx="10.5" cy="10.5" r="6" /><path d="m15 15 5 5" /></Svg>;
export const CloseIcon = (p: IconProps) => <Svg {...p}><path d="M6 6l12 12M18 6 6 18" /></Svg>;
export const ForwardIcon = (p: IconProps) => <Svg {...p}><path d="M5 12h14m-6-6 6 6-6 6" /></Svg>;
export const BackIcon = (p: IconProps) => <Svg {...p}><path d="M19 12H5m6-6-6 6 6 6" /></Svg>;
export const VolumeIcon = ({ level = 1, ...p }: IconProps & { level?: number }) => (
  <Svg {...p}>
    <path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z" fill="currentColor" stroke="none" />
    {level > 0 && <path d="M15.5 9.5a3.5 3.5 0 0 1 0 5" />}
    {level > 0.5 && <path d="M18 7a7 7 0 0 1 0 10" />}
    {level === 0 && <path d="m16 10 4 4m0-4-4 4" />}
  </Svg>
);
export const QueueIcon = (p: IconProps) => <Svg {...p}><rect x="3.5" y="4" width="6" height="6" rx="1" /><rect x="3.5" y="14" width="6" height="6" rx="1" /><path d="M13 6h7.5M13 8.5h5M13 16h7.5M13 18.5h5" /></Svg>;
export const ExpandIcon = (p: IconProps) => <Svg {...p}><path d="M14 4h6v6M10 20H4v-6M20 4l-7 7M4 20l7-7" /></Svg>;
export const CollapseIcon = (p: IconProps) => <Svg {...p}><path d="M20 10h-6V4M4 14h6v6M14 10l7-7M10 14l-7 7" /></Svg>;
export const GridIcon = (p: IconProps) => <Svg {...p}><rect x="4" y="4" width="6.5" height="6.5" rx="1" /><rect x="13.5" y="4" width="6.5" height="6.5" rx="1" /><rect x="4" y="13.5" width="6.5" height="6.5" rx="1" /><rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1" /></Svg>;
export const TourIcon = (p: IconProps) => <Svg {...p}><path d="M4 18c3-8 5-10 8-10s3 6 5 6 2-3 3-6" /><circle cx="20" cy="8" r="1.4" fill="currentColor" /><circle cx="4" cy="18" r="1.4" fill="currentColor" /></Svg>;
export const TargetIcon = (p: IconProps) => <Svg {...p}><circle cx="12" cy="12" r="7" /><circle cx="12" cy="12" r="2.2" fill="currentColor" stroke="none" /><path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3" /></Svg>;
export const FitIcon = (p: IconProps) => <Svg {...p}><path d="M4 9V4h5M15 4h5v5M20 15v5h-5M9 20H4v-5" /><rect x="8.5" y="8.5" width="7" height="7" rx="1" /></Svg>;
export const PlusIcon = (p: IconProps) => <Svg {...p}><path d="M12 5v14M5 12h14" /></Svg>;
export const MinusIcon = (p: IconProps) => <Svg {...p}><path d="M5 12h14" /></Svg>;
export const NextUpIcon = (p: IconProps) => <Svg {...p}><path d="M4 7h10M4 12h10M4 17h6" /><path d="M16 14.5v6l4.5-3z" fill="currentColor" stroke="none" /></Svg>;
export const AddIcon = (p: IconProps) => <Svg {...p}><path d="M4 7h11M4 12h11M4 17h7M18 13v8M14 17h8" /></Svg>;
export const StackIcon = (p: IconProps) => <Svg {...p}><rect x="7" y="7" width="13" height="13" rx="1.5" /><path d="M4 16.5V5.5A1.5 1.5 0 0 1 5.5 4h11" /></Svg>;
export const MenuIcon = (p: IconProps) => <Svg {...p}><circle cx="5.5" cy="12" r="1.4" fill="currentColor" stroke="none" /><circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none" /><circle cx="18.5" cy="12" r="1.4" fill="currentColor" stroke="none" /></Svg>;
/** A note with a slash: music not heard yet. */
export const UnheardIcon = (p: IconProps) => <Svg {...p}><path d="M10 17.5V5.5l8-1.5v10" /><circle cx="7.5" cy="17.5" r="2.5" /><circle cx="15.5" cy="14" r="2.5" /><path d="M4 4l16 16" /></Svg>;
export const SparkIcon = (p: IconProps) => <Svg {...p}><path d="M12 3v5M12 16v5M3 12h5M16 12h5M6 6l2.5 2.5M15.5 15.5 18 18M18 6l-2.5 2.5M8.5 15.5 6 18" /></Svg>;
