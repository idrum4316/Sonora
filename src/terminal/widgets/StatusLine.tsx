import { useEffect, useState } from 'react';
import { useStore } from '../../core/store';
import type { Item } from '../items';
import { rootView, useNav, type Focus } from '../nav';
import { press } from '../useKeymap';

/** A key from BINDINGS, and what it does right now. */
type Hint = [key: string, label: string];

const KEY_NAMES: Record<string, string> = { Enter: 'enter', Escape: 'esc', ' ': 'space' };
const MODE_NAMES: Record<Focus, string> = { nav: 'library', list: 'list', detail: 'detail', input: 'search' };
const KEY_LIT_MS = 160;

const ADD_HINTS: Hint[] = [['a', 'queue'], ['N', 'play next'], ['P', 'playlist']];
const GLOBAL_HINTS: Hint[] = [[' ', 'pause'], ['n', 'next'], ['p', 'prev'], ['/', 'search'], ['R', 'reload'], ['?', 'help']];

function selectionHints(item: Item, inList: boolean): Hint[] {
  const open = (label: string): Hint[] => (inList ? [['l', label]] : []);
  switch (item.kind) {
    case 'song': return [['Enter', 'play'], ...ADD_HINTS, ['f', 'star'], ['A', 'artist'], ['b', 'album']];
    case 'album': return [['Enter', 'play'], ...open('tracks'), ...ADD_HINTS, ['f', 'star'], ['A', 'artist']];
    case 'artist': return [['Enter', 'open'], ...open('albums'), ...ADD_HINTS, ['f', 'star']];
    case 'playlist':
    case 'genre': return [['Enter', 'play'], ...open('tracks'), ...ADD_HINTS];
    case 'action': return [['Enter', 'select']];
    case 'link': return [['Enter', 'open']];
    case 'recent': return [['Enter', 'search'], ['d', 'forget']];
    case 'info': return [];
  }
}

/** Hints for what can be done right now. Clicking one presses its key, so they double as the mouse's controls. */
function useHints(): Hint[] {
  const nav = useNav();
  const hasQueue = useStore(s => s.queue.length > 0);
  const hasTrack = useStore(s => !!s.currentTrack);
  const { focus, list, detail, back } = nav;
  const view = rootView(nav);
  const hints: Hint[] = [];

  if (focus === 'nav') {
    hints.push(['Enter', 'open']);
  } else if (focus === 'list' || focus === 'detail') {
    const pane = focus === 'list' ? list : detail;
    const item = pane.items[pane.cursor];
    if (item) hints.push(...selectionHints(item, focus === 'list'));
    if (view === 'playlists' && focus === 'list' && item) hints.push(['d', 'delete']);
    if (view === 'playlists' && focus === 'detail' && item) hints.push(['d', 'remove']);
    if (view === 'queue' && focus === 'list' && item) hints.push(['d', 'remove'], ['J', 'down'], ['K', 'up']);
    if (focus === 'detail' || back.length) hints.push(['Escape', 'back']);
  }

  // Song rows already offer these, for that song.
  if (view === 'now' && hasTrack && focus !== 'detail') hints.push(['A', 'artist'], ['b', 'album'], ['F', 'star']);
  if (view === 'albums') hints.push(['o', 'sort']);
  if (view === 'playlists') hints.push(['c', 'new']);
  if (view === 'queue' && hasQueue) hints.push(['c', 'clear']);
  return hints;
}

/** The key pressed a moment ago, so its hint can light up like it was struck. */
function useLitKey(): string | null {
  const [lit, setLit] = useState<string | null>(null);
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.repeat || e.ctrlKey || e.metaKey || e.altKey || e.target instanceof HTMLInputElement) return;
      clearTimeout(timer);
      setLit(e.key);
      timer = setTimeout(() => setLit(null), KEY_LIT_MS);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, []);
  return lit;
}

function Hints({ hints, lit, className }: { hints: Hint[]; lit: string | null; className: string }) {
  return (
    <div className={className}>
      {hints.map(([key, label]) => (
        <button
          type="button"
          tabIndex={-1}
          className={`t-hint${key === lit ? ' is-lit' : ''}`}
          key={`${key}-${label}`}
          // Keep focus where it is, so the action applies to the pane it's hinted for.
          onMouseDown={e => e.preventDefault()}
          onClick={() => press(key)}
        >
          <kbd>{KEY_NAMES[key] ?? key}</kbd> {label}
        </button>
      ))}
    </div>
  );
}

export function StatusLine() {
  const status = useNav(s => s.status);
  const focus = useNav(s => s.focus);
  const hints = useHints();
  const lit = useLitKey();
  return (
    <footer className="t-status">
      <span className="t-mode">{MODE_NAMES[focus]}</span>
      <Hints hints={hints} lit={lit} className="t-hints" />
      <Hints hints={GLOBAL_HINTS} lit={lit} className="t-hints t-hints-global" />
      <div className="t-status-message" role="status">
        {status && <span key={status.id} className={status.isError ? 'is-error' : undefined}>{status.text}</span>}
      </div>
    </footer>
  );
}
