import { useEffect, useRef, useState, type MouseEvent } from 'react';

interface ProgressBarProps {
  value: number;
  max: number;
  label: string;
  valueText: string;
  /** Says what a position in the bar means, for the label that follows the mouse. */
  formatTip: (value: number) => string;
  onSeek: (value: number) => void;
}

/** A bar of text, like [=====>-----], as many cells wide as fit. A click seeks to the cell it lands on. */
export function ProgressBar({ value, max, label, valueText, formatTip, onSeek }: ProgressBarProps) {
  const root = useRef<HTMLDivElement>(null);
  const ruler = useRef<HTMLSpanElement>(null);
  const [cell, setCell] = useState(0);
  const [cols, setCols] = useState(0);
  const [hover, setHover] = useState<number | null>(null);
  const active = max > 0;
  const ratio = active ? Math.max(0, Math.min(value / max, 1)) : 0;
  const filled = Math.round(ratio * cols);

  // Watching the ruler too catches the cell width changing when the web font arrives.
  useEffect(() => {
    if (!root.current || !ruler.current) return;
    const measure = () => {
      const width = ruler.current?.getBoundingClientRect().width ?? 0;
      setCell(width);
      // One cell is the closing bracket's.
      setCols(width ? Math.max(0, Math.floor((root.current?.clientWidth ?? 0) / width) - 1) : 0);
    };
    const observer = new ResizeObserver(measure);
    observer.observe(root.current);
    observer.observe(ruler.current);
    return () => observer.disconnect();
  }, []);

  const colAt = (e: MouseEvent<HTMLDivElement>) => {
    const x = e.clientX - e.currentTarget.getBoundingClientRect().left;
    return cell ? Math.max(0, Math.min(Math.floor(x / cell), cols - 1)) : 0;
  };
  /** The time at the start of a cell, and the end of the track for the last one. */
  const valueAt = (col: number) => (col >= cols - 1 ? 1 : col / cols) * max;

  return (
    <div className="t-progress-bar">
      <span aria-hidden="true">[</span>
      <div
        ref={root}
        className={`t-progress${active ? ' is-active' : ''}`}
        role="slider"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={Math.round(max)}
        aria-valuenow={Math.round(value)}
        aria-valuetext={valueText}
        onClick={e => { if (active) onSeek(valueAt(colAt(e))); }}
        onMouseMove={e => setHover(active && cols ? colAt(e) : null)}
        onMouseLeave={() => setHover(null)}
      >
        <span ref={ruler} className="t-progress-ruler" />
        <span aria-hidden="true">
          {filled > 0 && <span className="t-progress-done">{'='.repeat(filled - 1)}&gt;</span>}
          {'-'.repeat(Math.max(0, cols - filled))}]
        </span>
        {hover !== null && <div className="t-progress-hover" style={{ left: hover * cell }} />}
        {hover !== null && <span className="t-progress-tip" style={{ left: hover * cell }}>{formatTip(valueAt(hover))}</span>}
      </div>
    </div>
  );
}
