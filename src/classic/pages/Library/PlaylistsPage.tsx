import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router';
import { useStore } from '../../../core/store';
import { getPlaylists, createPlaylist } from '../../../core/subsonic';
import type { Playlist } from '../../../core/subsonic';
import { CoverArt, artClass } from '../../components/CoverArt';
import { LibraryNav } from './LibraryNav';
import { PlaylistCardSkeleton } from './LibraryShared';

export function PlaylistsPage() {
  const config = useStore(s => s.config)!;
  const bumpPlaylistVersion = useStore(s => s.bumpPlaylistVersion);
  const navigate = useNavigate();

  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    setLoading(true);
    getPlaylists(config)
      .then(setPlaylists)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [config]);

  const playPlaylist = useStore(s => s.playPlaylist);

  const handleCreate = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newName.trim();
    if (!trimmed) return;
    setCreating(true);
    try {
      const created = await createPlaylist(config, trimmed);
      bumpPlaylistVersion();
      setShowCreate(false);
      setNewName('');
      // Navigate to the new playlist
      if (created?.id) {
        navigate(`/playlist/${created.id}`);
      } else {
        // Refresh list
        const pls = await getPlaylists(config);
        setPlaylists(pls);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setCreating(false);
    }
  }, [config, newName, navigate]);

  return (
    <>
      <LibraryNav />

      <div className="library-content">
        {/* Create playlist header */}
        <div className="library-playlist-header">
          {showCreate ? (
            <form className="library-create-form" onSubmit={handleCreate}>
              <input
                className="library-create-input"
                type="text"
                placeholder="Playlist name…"
                value={newName}
                onChange={e => setNewName(e.target.value)}
                disabled={creating}
                maxLength={120}
                autoFocus
              />
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => { setShowCreate(false); setNewName(''); }}
                disabled={creating}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-primary btn-sm"
                disabled={!newName.trim() || creating}
              >
                {creating ? 'Creating…' : 'Create'}
              </button>
            </form>
          ) : (
            <button className="btn btn-secondary" onClick={() => setShowCreate(true)}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              New Playlist
            </button>
          )}
        </div>

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
                    <CoverArt coverArt={pl.coverArt} id={pl.id} size={500} alt="" />
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
