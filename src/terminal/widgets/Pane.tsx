import type { ReactNode } from 'react';

interface PaneProps {
  title: string;
  /** Shown inset on the bottom border, like a position counter. */
  meta?: string;
  /** A line about the pane's contents, above them. It wraps, and the tooltip has anything clipped. */
  summary?: string;
  focused?: boolean;
  className?: string;
  onMouseDown?: () => void;
  children: ReactNode;
}

/** A rounded box with its title inset in the top border. */
export function Pane({ title, meta, summary, focused, className, onMouseDown, children }: PaneProps) {
  return (
    <section
      className={`t-pane${focused ? ' is-focused' : ''}${className ? ` ${className}` : ''}`}
      aria-label={title}
      onMouseDown={onMouseDown}
    >
      <h2 className="t-pane-title">{title}</h2>
      {meta && <span className="t-pane-meta">{meta}</span>}
      {summary && <p className="t-pane-summary" title={summary}>{summary}</p>}
      {children}
    </section>
  );
}
