import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../../store/useStore';
import { getGenres } from '../../api/subsonic';
import type { Genre } from '../../api/subsonic';
import { genreGradient } from '../../utils/genreGradients';
import { LibraryNav } from './LibraryNav';

export function GenresPage() {
  const config = useStore(s => s.config)!;
  const navigate = useNavigate();

  const [genres, setGenres] = useState<Genre[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    getGenres(config)
      .then(setGenres)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [config]);

  return (
    <>
      <LibraryNav />

      <div className="library-content">
        {loading ? (
          <div className="library-genre-grid" aria-hidden="true">
            {Array.from({ length: 12 }, (_, i) => (
              <div key={i} className="skeleton" style={{ aspectRatio: '2/1', borderRadius: 'var(--radius-md)' }} />
            ))}
          </div>
        ) : genres.length === 0 ? (
          <div className="library-empty" role="status">
            <p>No genres found.</p>
          </div>
        ) : (
          <div className="library-genre-grid" role="list" aria-label={`${genres.length} genres`}>
            {genres.map((g, i) => (
              <div
                key={g.value}
                className="library-genre-card"
                role="listitem"
                tabIndex={0}
                aria-label={`${g.value}: ${g.albumCount} albums, ${g.songCount} songs`}
                style={{ background: genreGradient(g.value, i) }}
                onClick={() => navigate(`/genre/${encodeURIComponent(g.value)}`)}
                onKeyDown={e => e.key === 'Enter' && navigate(`/genre/${encodeURIComponent(g.value)}`)}
              >
                <div className="library-genre-name">{g.value}</div>
                <div className="library-genre-meta">
                  {g.albumCount} {g.albumCount === 1 ? 'album' : 'albums'} · {g.songCount} {g.songCount === 1 ? 'song' : 'songs'}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
