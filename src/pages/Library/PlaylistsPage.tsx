import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../../store/useStore';
import { getPlaylists, getPlaylist } from '../../api/subsonic';
import type { Playlist } from '../../api/subsonic';
import { CoverArt, artClass } from '../../components/CoverArt';
import { LibraryNav } from './LibraryNav';
import { PlaylistCardSkeleton } from './LibraryShared';

export function PlaylistsPage() {
  const config = useStore(s => s.config)!;
  const playTrack = useStore(s => s.playTrack);
  const navigate = useNavigate();

  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    getPlaylists(config)
      .then(setPlaylists)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [config]);

  const playPlaylist = useCallback(async (pl: Playlist) => {
    try {
      const detail = await getPlaylist(config, pl.id);
      if (detail.entry?.length) playTrack(detail.entry[0], detail.entry, 0);
    } catch (e) { console.error(e); }
  }, [config, playTrack]);

  return (
    <>
      <LibraryNav />

      <div className="library-content">
        {loading ? (
          <div className="library-playlist-grid" aria-hidden="true">
            {Array.from({ length: 8 }, (_, i) => <PlaylistCardSkeleton key={i} />)}
          </div>
        ) : playlists.length === 0 ? (
          <div className="library-empty" role="status">
            <p>No playlists yet.</p>
          </div>
        ) : (
          <div className="library-playlist-grid" role="list" aria-label={`${playlists.length} playlists`}>
            {playlists.map(pl => (
              <div
                key={pl.id}
                className="library-playlist-card"
                role="listitem"
                tabIndex={0}
                aria-label={`${pl.name}, ${pl.songCount} songs`}
                onClick={() => navigate(`/playlist/${pl.id}`)}
                onKeyDown={e => e.key === 'Enter' && navigate(`/playlist/${pl.id}`)}
              >
                <div className={`library-playlist-art ${artClass(pl.id)}`}>
                  {pl.coverArt && config && (
                    <CoverArt coverArt={pl.coverArt} id={pl.id} size={300} alt="" />
                  )}
                  <div className="library-playlist-play">
                    <button
                      className="album-card-play-btn"
                      aria-label={`Play ${pl.name}`}
                      onClick={e => { e.stopPropagation(); playPlaylist(pl); }}
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                        <polygon points="5,3 19,12 5,21" />
                      </svg>
                    </button>
                  </div>
                </div>
                <div className="library-playlist-info">
                  <div className="library-playlist-name">{pl.name}</div>
                  <div className="library-playlist-meta">
                    {pl.songCount} {pl.songCount === 1 ? 'song' : 'songs'}
                    {pl.owner ? ` · ${pl.owner}` : ''}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
