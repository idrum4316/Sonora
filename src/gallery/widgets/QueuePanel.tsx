import { useEffect, useRef } from 'react';
import { fmt } from '../../core/format';
import { useStore } from '../../core/store';
import { useUi } from '../ui';
import { Cover, LiveBars } from './Cover';
import { CloseIcon } from './Icons';

/** The queue as a column of covers, sliding in from the right. */
export function QueuePanel() {
  const open = useUi(s => s.queueOpen);
  const setOpen = useUi(s => s.setQueueOpen);
  const queue = useStore(s => s.queue);
  const queueIndex = useStore(s => s.queueIndex);
  const isPlaying = useStore(s => s.isPlaying);
  const { playTrack, removeFromQueue, clearQueue } = useStore.getState();
  const currentRef = useRef<HTMLLIElement>(null);

  useEffect(() => {
    if (open) currentRef.current?.scrollIntoView({ block: 'center' });
  }, [open]);

  return (
    <aside className={`g-queue${open ? ' is-open' : ''}`} aria-hidden={!open} inert={!open}>
      <header className="g-queue-head">
        <h2>Queue</h2>
        <span className="g-mono">{queue.length ? `${queueIndex + 1} / ${queue.length}` : 'empty'}</span>
        {queue.length > 1 && <button className="g-text-btn" onClick={clearQueue}>Clear</button>}
        <button className="g-icon-btn" onClick={() => setOpen(false)} aria-label="Close queue"><CloseIcon size={18} /></button>
      </header>
      {!queue.length && <p className="g-queue-empty">Nothing queued yet. Pick something on the atlas.</p>}
      <ol className="g-queue-list">
        {queue.map((song, i) => (
          <li
            key={`${song.id}-${i}`}
            ref={i === queueIndex ? currentRef : undefined}
            className={`g-queue-item${i === queueIndex ? ' is-current' : ''}${i < queueIndex ? ' is-past' : ''}`}
          >
            <button className="g-queue-hit" onClick={() => playTrack(song, queue, i)}>
              <Cover coverArt={song.coverArt} size={96} />
              <span className="g-queue-text">
                <span className="g-queue-title">{song.title}</span>
                <span className="g-queue-artist">{song.artist}</span>
              </span>
              {i === queueIndex ? <LiveBars playing={isPlaying} /> : <span className="g-mono g-dim">{fmt(song.duration)}</span>}
            </button>
            {i !== queueIndex && (
              <button className="g-icon-btn g-queue-remove" onClick={() => removeFromQueue(i)} aria-label={`Remove ${song.title}`}>
                <CloseIcon size={14} />
              </button>
            )}
          </li>
        ))}
      </ol>
    </aside>
  );
}

export function Toast() {
  const toast = useUi(s => s.toast);
  return <div className={`g-toast${toast ? ' is-shown' : ''}`} role="status">{toast}</div>;
}
