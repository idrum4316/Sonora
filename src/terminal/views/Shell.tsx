import { useEffect, useRef, type CSSProperties, type KeyboardEvent, type ReactNode } from 'react';
import { useStore } from '../../core/store';
import { activate } from '../commands';
import { detailHeading, songsIn } from '../items';
import { ROW_HEIGHT, VIEWS, openView, rootView, setCursor, setFocus, setSearchQuery, startNav, useNav, type ViewId } from '../nav';
import { useKeymap } from '../useKeymap';
import { DialogOverlay } from '../widgets/DialogOverlay';
import { HelpOverlay } from '../widgets/HelpOverlay';
import { PlaybackMark, Spinner } from '../widgets/Glyphs';
import { Logo } from '../widgets/Logo';
import { NowHero } from '../widgets/NowHero';
import { Pane } from '../widgets/Pane';
import { PlayerLine } from '../widgets/PlayerLine';
import { StatusLine } from '../widgets/StatusLine';
import { TrackPrint } from '../widgets/TrackPrint';
import { VirtualList } from '../widgets/VirtualList';

function Header() {
  const config = useStore(s => s.config);
  const screenTitle = useNav(s => s.screen.title);
  const back = useNav(s => s.back);
  const view = useNav(s => s.view);
  const scanning = useNav(s => !!s.scan?.scanning);
  const host = config ? config.serverUrl.replace(/^https?:\/\//, '') : '';
  const path = `:~/${[...back.map(entry => entry.screen.title), screenTitle].join('/')}`;
  return (
    <header className="t-header">
      <span className="t-brand">sonora</span>
      <span className="t-crumbs" title={path}>{path}</span>
      {/* Stands in for the library pane, which narrow screens hide. */}
      <nav className="t-tabs" aria-label="Views">
        {VIEWS.map(v => (
          <button
            key={v.id}
            type="button"
            tabIndex={-1}
            className={`t-tab${v.id === view ? ' is-on' : ''}`}
            aria-current={v.id === view ? 'page' : undefined}
            onClick={() => openView(v.id, v.id === 'search' ? 'input' : 'list')}
          >
            {v.label}
          </button>
        ))}
      </nav>
      <span className="t-identity">
        {scanning && <span className="t-scanning"><Spinner /> scanning</span>}
        <span className="t-identity-name">{config?.username}<span className="t-sep">@</span>{host}</span>
      </span>
    </header>
  );
}

/** Views that start a new group in the library pane, set apart by a blank row. */
const NAV_GROUP_STARTS = new Set<ViewId>(['queue', 'search']);

function NavPane() {
  const view = useNav(s => s.view);
  const focused = useNav(s => s.focus === 'nav');
  const queueLength = useStore(s => s.queue.length);
  const isPlaying = useStore(s => s.isPlaying);
  const hasTrack = useStore(s => !!s.currentTrack);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (focused) ref.current?.focus({ preventScroll: true });
  }, [focused]);

  return (
    <Pane title="library" focused={focused} className="t-nav" onMouseDown={() => setFocus('nav')}>
      <div ref={ref} className={`t-nav-list${focused ? ' is-focused' : ''}`} role="listbox" aria-label="Views" tabIndex={-1} aria-activedescendant={`nav-${view}`}>
        {VIEWS.map(v => (
          <div
            key={v.id}
            id={`nav-${v.id}`}
            role="option"
            aria-selected={v.id === view}
            className={`t-nav-row${v.id === view ? ' is-selected' : ''}${NAV_GROUP_STARTS.has(v.id) ? ' starts-group' : ''}`}
            onClick={() => openView(v.id, v.id === 'search' ? 'input' : 'nav')}
          >
            <kbd>{v.key}</kbd>
            <span>{v.label}</span>
            {v.id === 'queue' && queueLength > 0 && <span className="t-nav-count">{queueLength}</span>}
            {v.id === 'now' && hasTrack && <span className="t-nav-count is-live"><PlaybackMark playing={isPlaying} /></span>}
          </div>
        ))}
      </div>
    </Pane>
  );
}

function SearchBox() {
  const query = useNav(s => s.searchQuery);
  const focused = useNav(s => s.focus === 'input');
  const count = useNav(s => s.list.items.filter(item => item.kind !== 'recent').length);
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (focused) ref.current?.focus();
  }, [focused]);

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (['Enter', 'ArrowDown', 'Escape', 'Tab'].includes(e.key)) {
      e.preventDefault();
      setFocus('list');
    }
  }

  return (
    <label className={`t-search${focused ? ' is-focused' : ''}`}>
      <span className="t-search-prompt" aria-hidden="true">&gt;</span>
      <input
        ref={ref}
        value={query}
        placeholder="artists, albums, tracks"
        aria-label="Search"
        spellCheck={false}
        onChange={e => setSearchQuery(e.target.value)}
        onKeyDown={handleKeyDown}
        onFocus={() => setFocus('input')}
        onBlur={() => {
          // Clicking away leaves nothing focused, so hand focus to the list. Skip this when
          // switching windows, so the cursor is still in the box on the way back.
          if (document.hasFocus() && useNav.getState().focus === 'input') setFocus('list');
        }}
      />
      {query.trim() && count > 0 && <span className="t-search-count">{count.toLocaleString()}</span>}
    </label>
  );
}

function selectAndActivate(pane: 'list' | 'detail', index: number) {
  setFocus(pane);
  setCursor(pane, index);
  void activate();
}

const EMPTY_TEXT: Record<ViewId, ReactNode> = {
  albums: 'no albums',
  artists: 'no artists',
  playlists: <>no playlists. press <kbd>c</kbd> to create one</>,
  genres: 'no genres',
  favorites: <>nothing starred yet. press <kbd>f</kbd> on a track</>,
  queue: <>queue is empty. press <kbd>a</kbd> on anything to add it</>,
  now: <>press <kbd>enter</kbd> on a track to play it</>,
  search: 'no results',
  settings: '',
};

function ListPane() {
  const view = useNav(rootView);
  const title = useNav(s => s.screen.title);
  const list = useNav(s => s.list);
  const summary = useNav(s => s.screen.summary?.(s.list.items));
  const focused = useNav(s => s.focus === 'list');
  const inputFocused = useNav(s => s.focus === 'input');
  const query = useNav(s => s.searchQuery);
  const queueIndex = useStore(s => s.queueIndex);
  const position = list.items.length ? `${list.cursor + 1}/${list.items.length.toLocaleString()}` : undefined;
  const emptyText = !view ? 'nothing here' : view === 'search' && !query.trim() ? 'type to search' : EMPTY_TEXT[view];

  return (
    <Pane
      title={title}
      meta={position}
      summary={summary}
      focused={focused || inputFocused}
      className={`t-main${view === 'now' ? ' is-now' : ''}`}
      onMouseDown={() => { if (!inputFocused) setFocus('list'); }}
    >
      {view === 'search' && <><SearchBox /><hr className="t-rule" /></>}
      {view === 'now' && <><NowHero /><hr className="t-rule" /></>}
      <VirtualList
        id="list"
        label={title}
        pane={list}
        focused={focused}
        currentRow={view === 'queue' ? queueIndex : undefined}
        dimPlayed={view === 'queue'}
        showKind={view === 'search' || view === 'favorites'}
        highlight={view === 'search' ? query.trim().toLowerCase() : undefined}
        emptyText={emptyText}
        onSelect={index => { setFocus('list'); setCursor('list', index); }}
        onActivate={index => selectAndActivate('list', index)}
      />
    </Pane>
  );
}

function DetailPane() {
  const title = useNav(s => s.detailTitle);
  const detail = useNav(s => s.detail);
  const focused = useNav(s => s.focus === 'detail');
  const selected = useNav(s => s.list.items[s.list.cursor]);
  const isLive = useNav(s => !!s.screen.live);
  const upNext = useNav(s => rootView(s) === 'now');
  const showingHistory = useNav(s => rootView(s) === 'queue');
  const settings = useNav(s => rootView(s) === 'settings');
  const position = detail.items.length ? `${detail.cursor + 1}/${detail.items.length}` : undefined;
  // The list's own rows are what live views select, not what this pane is showing.
  const heading = !isLive && selected ? detailHeading(selected) : null;
  const showingPlaylist = selected?.kind === 'playlist';

  return (
    <Pane
      title={title}
      meta={position}
      summary={heading ? undefined : detail.summary}
      focused={focused}
      className="t-detail"
      onMouseDown={() => { if (detail.items.length) setFocus('detail'); }}
    >
      {heading && (
        <header className="t-hero">
          <div className="t-hero-text">
            <h3 className="t-hero-title" title={heading.title} key={heading.title}>{heading.title}</h3>
            {heading.subtitle && <p className="t-hero-subtitle" title={heading.subtitle}>{heading.subtitle}</p>}
            <p className={`t-hero-facts${detail.loading ? ' is-stale' : ''}`} title={detail.summary}>{detail.summary ?? ' '}</p>
          </div>
          <TrackPrint songs={songsIn(detail.items)} selected={focused ? detail.cursor : null} stale={detail.loading} />
        </header>
      )}
      {heading && <hr className="t-rule" />}
      {settings ? (
        <div className="t-about">
          <Logo />
          <p>a keyboard-first client for navidrome</p>
        </div>
      ) : (
        <VirtualList
          id="detail"
          label={heading ? `${heading.title}, ${title}` : title}
          pane={detail}
          focused={focused}
          // The current track is never in up next, though another copy of it can be.
          currentRow={upNext ? -1 : undefined}
          emptyText={upNext ? 'no upcoming tracks' : showingHistory ? 'nothing played yet' : showingPlaylist ? <>no tracks yet. press <kbd>P</kbd> on anything to add it</> : ''}
          onSelect={index => { setFocus('detail'); setCursor('detail', index); }}
          onActivate={index => selectAndActivate('detail', index)}
        />
      )}
    </Pane>
  );
}

export function Shell() {
  const helpOpen = useNav(s => s.helpOpen);
  const dialog = useNav(s => s.dialog);
  useKeymap();
  useEffect(() => startNav(), []);

  return (
    <div className="t-app" style={{ '--t-row': `${ROW_HEIGHT}px` } as CSSProperties}>
      <Header />
      <main className="t-body">
        <NavPane />
        <ListPane />
        <DetailPane />
      </main>
      <PlayerLine />
      <StatusLine />
      {helpOpen && <HelpOverlay />}
      {dialog && <DialogOverlay dialog={dialog} />}
    </div>
  );
}
