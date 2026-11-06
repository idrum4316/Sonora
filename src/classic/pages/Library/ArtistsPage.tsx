import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router';
import { useStore } from '../../../core/store';
import { getArtistsIndexed } from '../../../core/subsonic';
import type { ArtistIndex } from '../../../core/subsonic';
import { ArtistCard } from '../../components/ArtistCard';
import { LibraryNav } from './LibraryNav';
import { ArtistListRow, ViewToggle, ArtistsPageSkeleton } from './LibraryShared';
import type { ViewMode } from './LibraryShared';

export function ArtistsPage() {
  const config = useStore(s => s.config)!;
  const navigate = useNavigate();

  const [artistIndices, setArtistIndices] = useState<ArtistIndex[]>([]);
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState<ViewMode>(() => {
    const saved = localStorage.getItem('library-artist-view');
    return saved === 'grid' || saved === 'list' ? saved : 'list';
  });
  const [search, setSearch] = useState('');

  useEffect(() => {
    setLoading(true);
    getArtistsIndexed(config)
      .then(setArtistIndices)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [config]);

  const query = search.toLowerCase().trim();
  const filteredArtists = useMemo(() => {
    if (!query) return artistIndices;
    return artistIndices
      .map(idx => ({ ...idx, artist: idx.artist.filter(a => a.name.toLowerCase().includes(query)) }))
      .filter(idx => idx.artist.length > 0);
  }, [artistIndices, query]);

  const totalCount = useMemo(() => artistIndices.reduce((n, idx) => n + idx.artist.length, 0), [artistIndices]);
  const filteredCount = useMemo(() => filteredArtists.reduce((n, idx) => n + idx.artist.length, 0), [filteredArtists]);
  const isSearching = !!query;

  return (
    <>
      <LibraryNav />

      <div className="library-controls">
        <div className="artists-search-wrap">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="search"
            className="artists-search-input"
            placeholder="Search artists…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            aria-label="Search artists"
          />
        </div>
        {!loading && (
          <span className="section-meta" style={{ marginLeft: 8 }}>
            {isSearching ? `${filteredCount} of ${totalCount}` : `${totalCount} artists`}
          </span>
        )}
        <div className="spacer" />
        <ViewToggle view={view} onChange={v => { setView(v); localStorage.setItem('library-artist-view', v); }} />
      </div>

      <div className="library-content">
        {loading ? (
          <ArtistsPageSkeleton view={view} />
        ) : filteredArtists.length === 0 ? (
          <div className="library-empty" role="status">
            {isSearching
              ? <p>No artists found for <strong>"{search}"</strong>.</p>
              : <p>No artists in your library yet.</p>
            }
          </div>
        ) : isSearching ? (
          <div className={view === 'grid' ? 'artist-grid' : undefined} role="list" aria-label={`${filteredCount} matching artists`}>
            {filteredArtists.flatMap(idx => idx.artist).map(artist =>
              view === 'grid' ? (
                <ArtistCard key={artist.id} artist={artist} />
              ) : (
                <ArtistListRow key={artist.id} artist={artist} onNavigate={() => navigate(`/artist/${artist.id}`)} />
              )
            )}
          </div>
        ) : (
          <>
            {filteredArtists.length > 1 && (
              <nav className="library-jump-nav" aria-label="Jump to letter">
                {filteredArtists.map(idx => (
                  <a key={idx.name} href={`#lib-letter-${encodeURIComponent(idx.name)}`} className="library-jump-link">
                    {idx.name}
                  </a>
                ))}
              </nav>
            )}

            {filteredArtists.map(idx => (
              <section
                key={idx.name}
                id={`lib-letter-${encodeURIComponent(idx.name)}`}
                className="letter-group"
                aria-labelledby={`lib-heading-${idx.name}`}
              >
                <div className="letter-heading" id={`lib-heading-${idx.name}`}>{idx.name}</div>
                {view === 'grid' ? (
                  <div className="artist-grid" role="list">
                    {idx.artist.map(artist => (
                      <ArtistCard key={artist.id} artist={artist} />
                    ))}
                  </div>
                ) : (
                  <div role="list">
                    {idx.artist.map(artist => (
                      <ArtistListRow key={artist.id} artist={artist} onNavigate={() => navigate(`/artist/${artist.id}`)} />
                    ))}
                  </div>
                )}
              </section>
            ))}
          </>
        )}
      </div>
    </>
  );
}
