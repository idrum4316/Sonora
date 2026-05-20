import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useEffect, useRef, useCallback, useState } from 'react';
import { useStore } from '../../store/useStore';
import { getPlaylists } from '../../api/subsonic';
import type { Playlist } from '../../api/subsonic';
import { CoverArt, artClass } from '../CoverArt';
import { ThemeToggle } from '../ThemeToggle';

const IconHome = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9,22 9,12 15,12 15,22"/>
  </svg>
);
const IconLibrary = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
  </svg>
);
const IconQueue = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M9 18V5l12-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="18" cy="16" r="3" />
  </svg>
);
const IconSettings = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="12" cy="12" r="3"/>
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
  </svg>
);
const IconLogo = () => (
  <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden="true">
    <circle cx="14" cy="14" r="12" stroke="currentColor" strokeWidth="1.5"/>
    <path d="M9 18 Q14 8 19 18" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
    <circle cx="14" cy="14" r="2.5" fill="currentColor"/>
  </svg>
);

export function Sidebar() {
  const config = useStore(s => s.config);
  const playlistVersion = useStore(s => s.playlistVersion);
  const navigate = useNavigate();
  const location = useLocation();
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!config) return;
    getPlaylists(config).then(setPlaylists).catch(console.error);
  }, [config, playlistVersion]);

  // Keep sidebar search in sync with URL when on /search
  useEffect(() => {
    if (location.pathname === '/search') {
      const q = new URLSearchParams(location.search).get('q') ?? '';
      setSearchQuery(prev => (prev !== q ? q : prev));
    }
  }, [location.pathname, location.search]);

  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchQuery(value);
    const encoded = value.trim() ? `?q=${encodeURIComponent(value.trim())}` : '';
    navigate(`/search${encoded}`, { replace: location.pathname === '/search' });
  }, [navigate, location.pathname]);

  const handleSearchClear = useCallback(() => {
    setSearchQuery('');
    navigate('/search', { replace: true });
    searchInputRef.current?.focus();
  }, [navigate]);

  const handleSearchKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') handleSearchClear();
  }, [handleSearchClear]);

  const username = config?.username ?? '';
  const initials = username.slice(0, 2).toUpperCase() || 'ME';

  return (
    <aside className="sidebar" role="navigation" aria-label="Main navigation">
      <div className="sidebar-logo" aria-label="Sonora">
        <IconLogo />
        <span className="sidebar-logo-name">Sonora</span>
      </div>

      {/* Inline search */}
      <div className="sidebar-search">
        <div className="sidebar-search-wrap">
          <span className="sidebar-search-icon" aria-hidden="true">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
          </span>
          <input
            ref={searchInputRef}
            type="search"
            className="sidebar-search-input"
            placeholder="Search…"
            value={searchQuery}
            onChange={handleSearchChange}
            onKeyDown={handleSearchKeyDown}
            aria-label="Search your library"
            autoComplete="off"
            spellCheck={false}
          />
          {searchQuery && (
            <button
              className="sidebar-search-clear"
              aria-label="Clear search"
              tabIndex={-1}
              onClick={handleSearchClear}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          )}
        </div>
      </div>

      <div className="sidebar-scroll">
        <div className="sidebar-section">
          <div className="sidebar-section-label">Discover</div>
          <NavLink to="/" end className={({ isActive }) => `sidebar-nav-item${isActive ? ' active' : ''}`} aria-current="page">
            <IconHome /> Home
          </NavLink>
          <NavLink to="/library/albums" className={() => `sidebar-nav-item${location.pathname.startsWith('/library') ? ' active' : ''}`}>
            <IconLibrary /> Library
          </NavLink>
          <NavLink to="/queue" className={({ isActive }) => `sidebar-nav-item${isActive ? ' active' : ''}`}>
            <IconQueue /> Queue
          </NavLink>
        </div>

        {playlists.length > 0 && (
          <div className="sidebar-section">
            <div className="sidebar-section-label">Playlists</div>
            {playlists.slice(0, 12).map(pl => (
              <NavLink
                key={pl.id}
                to={`/playlist/${pl.id}`}
                className={({ isActive }) => `sidebar-nav-item${isActive ? ' active' : ''}`}
                aria-label={`Playlist: ${pl.name}`}
              >
                <div className={`sidebar-playlist-art ${artClass(pl.id)}`}>
                  {pl.coverArt && config && (
                    <CoverArt coverArt={pl.coverArt} id={pl.id} size={56} alt="" />
                  )}
                </div>
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{pl.name}</span>
              </NavLink>
            ))}
          </div>
        )}
      </div>

      <div className="sidebar-footer">
        <div className="sidebar-avatar" aria-label={`User: ${username}`}>{initials}</div>
        <span className="sidebar-user-name">{username}</span>
        <ThemeToggle className="sidebar-theme-toggle" />
        <button
          className="sidebar-settings-btn"
          aria-label="Settings"
          title="Settings"
          onClick={() => navigate('/settings')}
        >
          <IconSettings />
        </button>
      </div>
    </aside>
  );
}
