import { useEffect, useRef } from 'react';
import { useNav } from '../nav';
import { Pane } from './Pane';

/** A group's rows. Each key is a set of keycaps, written with spaces between them. */
const GROUPS: { title: string; keys: [string, string][] }[] = [
  {
    title: 'move',
    keys: [
      ['j k ↑ ↓', 'up and down'],
      ['g G', 'first and last'],
      ['pgup pgdn', 'by a page'],
      ['h l tab', 'between panes'],
      ['1–8', 'jump to a view'],
      ['esc', 'back'],
    ],
  },
  {
    title: 'act',
    keys: [
      ['enter', 'play or open'],
      ['a', 'add to queue'],
      ['N', 'play next'],
      ['f', 'star selection'],
      ['F', 'star current track'],
      ['A', 'go to artist'],
      ['b', 'go to album'],
      ['R', 'reload list'],
      ['o', 'album sort'],
    ],
  },
  {
    title: 'playback',
    keys: [
      ['space', 'pause'],
      ['n p', 'next and previous'],
      ['← →', 'seek 5 seconds'],
      ['+ -', 'volume'],
      ['m', 'mute'],
      ['s', 'shuffle'],
      ['r', 'repeat'],
    ],
  },
  {
    title: 'queue & global',
    keys: [
      ['d', 'remove'],
      ['J K', 'move track'],
      ['c', 'clear queue'],
      ['/', 'new search'],
      ['t', 'light or dark'],
      ['T', 'next accent'],
      ['?', 'this help'],
    ],
  },
  {
    title: 'playlists',
    keys: [
      ['P', 'add selection to a playlist'],
      ['c', 'new playlist'],
      ['d', 'delete playlist or remove track'],
    ],
  },
  {
    title: 'mouse',
    keys: [
      ['click', 'select a row or focus a pane'],
      ['dbl-click', 'play or open'],
      ['bottom bar', 'click a hint to run it'],
    ],
  },
];

const close = () => useNav.setState({ helpOpen: false });

/** Mouse gestures read as words. Everything else is a key you can press, so it's drawn as one. */
function KeyCaps({ keys, words }: { keys: string; words: boolean }) {
  if (words) return <span className="t-help-word">{keys}</span>;
  return <>{keys.split(' ').map(key => <kbd key={key}>{key}</kbd>)}</>;
}

export function HelpOverlay() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => { ref.current?.focus(); }, []);
  return (
    <div
      className="t-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="Keyboard shortcuts"
      tabIndex={-1}
      ref={ref}
      onMouseDown={e => { if (e.target === e.currentTarget) close(); }}
    >
      <Pane title="keys" focused className="t-help">
        <div className="t-help-groups">
          {GROUPS.map(group => (
            <div key={group.title} className="t-help-group">
              <h3>{group.title}</h3>
              <dl>
                {group.keys.map(([key, label]) => (
                  <div key={key}><dt><KeyCaps keys={key} words={group.title === 'mouse'} /></dt><dd>{label}</dd></div>
                ))}
              </dl>
            </div>
          ))}
        </div>
        <div className="t-dialog-actions">
          <button type="button" tabIndex={-1} className="t-link" onClick={close}><kbd>esc</kbd> close</button>
        </div>
      </Pane>
    </div>
  );
}
