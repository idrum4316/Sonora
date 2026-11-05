import { useState, type MouseEvent } from 'react';

interface ProgressBarProps {
  value: number;
  max: number;
  label: string;
  valueText: string;
  /** Says what a position in the bar means, for the label that follows the mouse. */
  formatTip: (value: number) => string;
  onSeek: (value: number) => void;
}

/**
 * A glowing line over a thin one. It's drawn with CSS rather than box-drawing characters,
 * whose widths depend on the font, so the fill lines up exactly with where a click seeks.
 */
export function ProgressBar({ value, max, label, valueText, formatTip, onSeek }: ProgressBarProps) {
  const [hover, setHover] = useState<number | null>(null);
  const ratio = max > 0 ? Math.max(0, Math.min(value / max, 1)) : 0;

  const ratioAt = (e: MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    return Math.max(0, Math.min((e.clientX - rect.left) / rect.width, 1));
  };

  function handleClick(e: MouseEvent<HTMLDivElement>) {
    if (max > 0) onSeek(ratioAt(e) * max);
  }

  return (
    <div
      className={`t-progress${max > 0 ? ' is-active' : ''}`}
      role="slider"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={Math.round(max)}
      aria-valuenow={Math.round(value)}
      aria-valuetext={valueText}
      onClick={handleClick}
      onMouseMove={e => setHover(max > 0 ? ratioAt(e) : null)}
      onMouseLeave={() => setHover(null)}
    >
      {hover !== null && <div className="t-progress-ghost" style={{ width: `${hover * 100}%` }} />}
      <div className="t-progress-done" style={{ width: `${ratio * 100}%` }} />
      {hover !== null && <span className="t-progress-tip" style={{ left: `${hover * 100}%` }}>{formatTip(hover * max)}</span>}
    </div>
  );
}
