import { useEffect } from 'react';
import { useStore } from '../core/store';
import { crossfade } from './motion';
import {
  activate, addSelectionToPlaylist, changeVolume, createOrClear, cycleAccent, enqueue, goToAlbum, goToArtist, moveBy,
  moveFocus, moveSelected, moveToEdge, removeSelected, seekBy, starCurrent, starSelected,
} from './commands';
import {
  VIEWS, closeDialog, cycleAlbumSort, goBack, openView, reload, runDialogRow, setDialogCursor,
  startNewSearch, useNav, type Dialog,
} from './nav';

const PAGE = 10;

/** Keys that keep acting while held down. Everything else fires once per press. */
const REPEATABLE = new Set(['j', 'k', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'PageUp', 'PageDown', '+', '=', '-', 'J', 'K']);

function isEditable(target: EventTarget | null) {
  return target instanceof HTMLElement
    && (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName));
}

const store = () => useStore.getState();

const BINDINGS: Record<string, () => void> = {
  // Move
  j: () => moveBy(1),
  ArrowDown: () => moveBy(1),
  k: () => moveBy(-1),
  ArrowUp: () => moveBy(-1),
  PageDown: () => moveBy(PAGE),
  PageUp: () => moveBy(-PAGE),
  g: () => moveToEdge('first'),
  Home: () => moveToEdge('first'),
  G: () => moveToEdge('last'),
  End: () => moveToEdge('last'),
  h: () => moveFocus(-1),
  l: () => moveFocus(1),
  // Act
  Enter: () => void activate(),
  a: () => void enqueue('end'),
  N: () => void enqueue('next'),
  P: () => void addSelectionToPlaylist(),
  f: starSelected,
  F: starCurrent,
  A: goToArtist,
  b: goToAlbum,
  Escape: goBack,
  // Playback
  ' ': () => store().togglePlay(),
  n: () => store().next(),
  p: () => store().prev(),
  ArrowLeft: () => seekBy(-5),
  ArrowRight: () => seekBy(5),
  '+': () => changeVolume(0.05),
  '=': () => changeVolume(0.05),
  '-': () => changeVolume(-0.05),
  m: () => store().toggleMute(),
  s: () => store().toggleShuffle(),
  r: () => store().cycleRepeat(),
  // Queue
  d: removeSelected,
  J: () => moveSelected(1),
  K: () => moveSelected(-1),
  c: createOrClear,
  // Views
  '/': startNewSearch,
  o: cycleAlbumSort,
  R: reload,
  t: () => crossfade(() => store().toggleTheme()),
  T: cycleAccent,
  '?': () => useNav.setState({ helpOpen: true }),
};
for (const view of VIEWS) {
  if (view.key !== '/') BINDINGS[view.key] = () => openView(view.id);
}

/** Runs a key's action. The clickable hints use this, so a click does exactly what the key does. */
export function press(key: string) {
  BINDINGS[key]?.();
}

/** Handles a key while a dialog is open. It's modal, so global shortcuts don't apply. */
function onDialogKey(e: KeyboardEvent, dialog: Dialog) {
  if (e.key === 'Escape') {
    e.preventDefault();
    closeDialog();
  } else if (e.key === 'Tab') {
    e.preventDefault();
  } else if (dialog.kind === 'confirm') {
    const key = e.key.toLowerCase();
    if (key !== 'y' && key !== 'n') return;
    e.preventDefault();
    if (e.repeat) return;
    if (key === 'y') dialog.onConfirm();
    else closeDialog();
  } else if (dialog.kind === 'pick') {
    const { cursor, items } = dialog.pane;
    const moves: Record<string, number> = {
      j: cursor + 1, ArrowDown: cursor + 1,
      k: cursor - 1, ArrowUp: cursor - 1,
      PageDown: cursor + PAGE, PageUp: cursor - PAGE,
      g: 0, Home: 0,
      G: items.length - 1, End: items.length - 1,
    };
    if (moves[e.key] !== undefined) {
      e.preventDefault();
      setDialogCursor(moves[e.key]);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (!e.repeat) runDialogRow(cursor);
    }
  }
  // In a prompt, the input and its form handle everything else.
}

/** Installs the global keyboard shortcuts for as long as the component is mounted. */
export function useKeymap() {
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey || e.isComposing) return;

      const { dialog } = useNav.getState();
      if (dialog) {
        onDialogKey(e, dialog);
        return;
      }
      if (isEditable(e.target)) return;

      if (useNav.getState().helpOpen) {
        if (e.key === 'Escape' || e.key === '?') useNav.setState({ helpOpen: false });
        e.preventDefault();
        return;
      }
      if (e.key === 'Tab') {
        e.preventDefault();
        moveFocus(e.shiftKey ? -1 : 1, true);
        return;
      }

      const action = BINDINGS[e.key];
      if (!action) return;
      e.preventDefault();
      if (e.repeat && !REPEATABLE.has(e.key)) return;
      action();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);
}
