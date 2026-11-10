import { useEffect, useMemo, useRef, useState } from 'react';
import { fmt } from '../../core/format';
import { useStore } from '../../core/store';
import { search3, type SearchResult } from '../../core/subsonic';
import { ARRANGEMENTS, genresOf, useGallery } from '../library';
import { artistPath, back, go, type Route } from '../router';
import { atlasApi } from '../wall/Atlas';
import { Cover } from '../widgets/Cover';
import { BackIcon, CloseIcon, GridIcon, HeartIcon, MenuIcon, PlayIcon, SearchIcon, StackIcon, TourIcon } from '../widgets/Icons';

/** The wordmark: a 3×3 grid of lights, one per arrangement of a cover's colors. */
export function Wordmark({ onClick }: { onClick?: () => void }) {
  return (
    <button className="g-wordmark" onClick={onClick} aria-label="Sonora Gallery, back to the atlas">
      <span className="g-wordmark-grid" aria-hidden="true">{Array.from({ length: 9 }, (_, i) => <i key={i} />)}</span>
      <span className="g-wordmark-text">sonora<em>gallery</em></span>
    </button>
  );
}

export function TopBar({ route }: { route: Route }) {
  const onAtlas = route.view === 'atlas';
  const arrangement = useGallery(s => s.arrangement);
  const setArrangement = useGallery(s => s.setArrangement);
  const touring = useGallery(s => s.touring);
  const setTouring = useGallery(s => s.setTouring);

  if (route.view === 'stage') return null;

  return (
    <header className={`g-topbar${onAtlas ? ' is-atlas' : ''}`}>
      <div className="g-topbar-left">
        {!onAtlas && (
          <button className="g-icon-btn g-back" onClick={back} title="Back (esc)"><BackIcon size={20} /></button>
        )}
        <Wordmark onClick={() => go('/')} />
      </div>

      {onAtlas && (
        <nav className="g-arrangements" aria-label="Arrangement">
          {ARRANGEMENTS.map((a, i) => (
            <button
              key={a.id}
              className={a.id === arrangement ? 'is-on' : ''}
              aria-pressed={a.id === arrangement}
              onClick={() => setArrangement(a.id)}
              title={`${a.hint} (${i + 1})`}
            >
              {a.label}
            </button>
          ))}
        </nav>
      )}

      <div className="g-topbar-right">
        {onAtlas && <Spotlight />}
        {onAtlas && <Filters />}
        {onAtlas && (
          <button className={`g-pill${touring ? ' is-accent' : ''}`} onClick={() => setTouring(!touring)} title="Let the atlas show you around (t)">
            <TourIcon size={17} />{touring ? 'Touring' : 'Tour'}
          </button>
        )}
        {!onAtlas && (
          <button className="g-pill" onClick={() => go('/')} title="The atlas"><GridIcon size={16} />Atlas</button>
        )}
        <button className={`g-pill${route.view === 'playlists' ? ' is-on' : ''}`} onClick={() => go('/playlists')} title="Playlists">
          <StackIcon size={16} />Playlists
        </button>
        <AppMenu />
      </div>
    </header>
  );
}

// ── Search ───────────────────────────────────────────────────────────────────
/**
 * Searching lights up the matching covers on the atlas and dims the rest, so results appear in place.
 * Songs and artists from the server show in a panel underneath.
 */
function Spotlight() {
  const query = useGallery(s => s.query);
  const setQuery = useGallery(s => s.setQuery);
  const config = useStore(s => s.config);
  const playTrack = useStore(s => s.playTrack);
  const inputRef = useRef<HTMLInputElement>(null);
  const [focused, setFocused] = useState(false);
  const [results, setResults] = useState<SearchResult | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === '/' && !(e.target as HTMLElement).closest('input, textarea')) {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    const q = query.trim();
    if (!config || q.length < 2) { setResults(null); return; }
    let live = true;
    const timer = window.setTimeout(() => {
      search3(config, q, 6, 0, 8).then(r => { if (live) setResults(r); }).catch(() => {});
    }, 260);
    return () => { live = false; clearTimeout(timer); };
  }, [query, config]);

  const open = focused && !!results && (results.artist.length > 0 || results.song.length > 0);

  return (
    <div className={`g-spotlight${query ? ' has-query' : ''}`}>
      <SearchIcon size={17} />
      <input
        ref={inputRef}
        value={query}
        placeholder="Search the atlas"
        aria-label="Search the atlas"
        spellCheck={false}
        onChange={e => setQuery(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setTimeout(() => setFocused(false), 150)}
        onKeyDown={e => {
          if (e.key === 'Enter') { atlasApi.focusFirstLit(); inputRef.current?.blur(); }
          if (e.key === 'Escape') { setQuery(''); inputRef.current?.blur(); }
        }}
      />
      {query ? (
        <button className="g-icon-btn" onClick={() => setQuery('')} aria-label="Clear search"><CloseIcon size={15} /></button>
      ) : (
        <kbd>/</kbd>
      )}
      {open && (
        <div className="g-spotlight-panel">
          {results!.artist.length > 0 && (
            <section>
              <h3 className="g-eyebrow">Artists</h3>
              <div className="g-spotlight-artists">
                {results!.artist.map(a => (
                  <button key={a.id} onMouseDown={() => go(artistPath(a.id))}>
                    <Cover coverArt={a.coverArt} src={a.artistImageUrl || undefined} size={120} />
                    <span>{a.name}</span>
                  </button>
                ))}
              </div>
            </section>
          )}
          {results!.song.length > 0 && (
            <section>
              <h3 className="g-eyebrow">Songs</h3>
              <ul className="g-spotlight-songs">
                {results!.song.map((song, i) => (
                  <li key={song.id}>
                    <button onMouseDown={() => playTrack(song, results!.song, i)}>
                      <Cover coverArt={song.coverArt} size={96} />
                      <span className="g-spotlight-song">
                        <span>{song.title}</span>
                        <small>{song.artist} · {song.album}</small>
                      </span>
                      <span className="g-mono g-dim">{fmt(song.duration)}</span>
                      <PlayIcon size={14} />
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          )}
          <p className="g-spotlight-foot"><kbd>enter</kbd> flies to the first lit album</p>
        </div>
      )}
    </div>
  );
}

function Filters() {
  const albums = useGallery(s => s.albums);
  const starredOnly = useGallery(s => s.starredOnly);
  const setStarredOnly = useGallery(s => s.setStarredOnly);
  const genre = useGallery(s => s.genre);
  const setGenre = useGallery(s => s.setGenre);
  const genres = useMemo(() => genresOf(albums).slice(0, 40), [albums]);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: PointerEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    window.addEventListener('pointerdown', close);
    return () => window.removeEventListener('pointerdown', close);
  }, [open]);

  return (
    <>
      <button className={`g-pill${starredOnly ? ' is-accent' : ''}`} onClick={() => setStarredOnly(!starredOnly)} aria-pressed={starredOnly} title="Light up favorites only">
        <HeartIcon size={16} filled={starredOnly} />Favorites
      </button>
      {genres.length > 0 && (
        <div className="g-menu-wrap" ref={ref}>
          <button className={`g-pill${genre ? ' is-accent' : ''}`} onClick={() => setOpen(!open)} aria-expanded={open}>
            {genre ?? 'Genre'}
            {genre && <span className="g-pill-x" onClick={e => { e.stopPropagation(); setGenre(null); }} aria-label="Clear genre"><CloseIcon size={13} /></span>}
          </button>
          {open && (
            <div className="g-menu g-genre-menu" role="menu">
              {genres.map(g => (
                <button key={g.name} role="menuitemradio" aria-checked={g.name === genre} className={g.name === genre ? 'is-on' : ''}
                  onClick={() => { setGenre(g.name === genre ? null : g.name); setOpen(false); }}>
                  <span>{g.name}</span><span className="g-mono g-dim">{g.count}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </>
  );
}

function AppMenu() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const config = useStore(s => s.config);
  const clearConfig = useStore(s => s.clearConfig);

  useEffect(() => {
    if (!open) return;
    const close = (e: PointerEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    window.addEventListener('pointerdown', close);
    return () => window.removeEventListener('pointerdown', close);
  }, [open]);

  return (
    <div className="g-menu-wrap" ref={ref}>
      <button className="g-icon-btn" onClick={() => setOpen(!open)} aria-expanded={open} aria-label="Menu"><MenuIcon size={20} /></button>
      {open && (
        <div className="g-menu g-app-menu" role="menu">
          <div className="g-menu-note">
            <span className="g-eyebrow">Connected</span>
            <span className="g-mono">{config?.username}@{config?.serverUrl.replace(/^https?:\/\//, '')}</span>
          </div>
          <a href="/" role="menuitem">Classic interface</a>
          <a href="/terminal/" role="menuitem">Terminal interface</a>
          <div className="g-menu-keys">
            <span className="g-eyebrow">Keys</span>
            <span><kbd>space</kbd> play / pause</span>
            <span><kbd>/</kbd> search</span>
            <span><kbd>1</kbd>–<kbd>4</kbd> arrangements</span>
            <span><kbd>t</kbd> tour · <kbd>l</kbd> find playing</span>
            <span><kbd>f</kbd> stage · <kbd>q</kbd> queue</span>
            <span><kbd>n</kbd> / <kbd>p</kbd> next / previous</span>
          </div>
          <button role="menuitem" className="is-danger" onClick={clearConfig}>Disconnect</button>
        </div>
      )}
    </div>
  );
}
