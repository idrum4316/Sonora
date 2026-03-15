import { Link, useLocation } from 'react-router-dom';

const TABS = [
  { path: '/library/albums', label: 'Albums' },
  { path: '/library/artists', label: 'Artists' },
  { path: '/library/playlists', label: 'Playlists' },
  { path: '/library/genres', label: 'Genres' },
  { path: '/library/favorites', label: 'Favorites' },
] as const;

export function LibraryNav() {
  const { pathname } = useLocation();

  return (
    <>
      <div className="library-header">
        <h1 className="library-title">Your Library</h1>
        <div className="tab-bar" role="tablist" aria-label="Library sections">
          {TABS.map(tab => (
            <Link
              key={tab.path}
              to={tab.path}
              className={`tab${pathname === tab.path ? ' active' : ''}`}
              role="tab"
              aria-selected={pathname === tab.path}
            >
              {tab.label}
            </Link>
          ))}
        </div>
      </div>
    </>
  );
}
