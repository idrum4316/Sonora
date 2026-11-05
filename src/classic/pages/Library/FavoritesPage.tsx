import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../../../core/store';
import { getStarred } from '../../../core/subsonic';
import type { Album, Song } from '../../../core/subsonic';
import { AlbumCard } from '../../components/AlbumCard';
import { fmt } from '../../../core/format';
import { IconPlay } from '../../components/ui';
import { LibraryNav } from './LibraryNav';
import { StarredSkeleton } from './LibraryShared';
import { TrackMoreButton, useTrackMenu } from '../../components/TrackMenu';

export function FavoritesPage() {
  const config = useStore(s => s.config)!;
  const playTrack = useStore(s => s.playTrack);
  const currentTrack = useStore(s => s.currentTrack);
  const isPlaying = useStore(s => s.isPlaying);
  const navigate = useNavigate();

  const { openMenu, menuPortal } = useTrackMenu();

  const [songs, setSongs] = useState<Song[]>([]);
  const [albums, setAlbums] = useState<Album[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    getStarred(config)
      .then(data => { setSongs(data.song); setAlbums(data.album); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [config]);

  const playAlbum = useStore(s => s.playAlbum);

  return (
    <>
      <LibraryNav />

      <div className="library-content">
        {loading ? (
          <StarredSkeleton />
        ) : songs.length === 0 && albums.length === 0 ? (
          <div className="library-empty" role="status">
            <p>No starred items yet. Like songs and albums to see them here.</p>
          </div>
        ) : (
          <>
            {albums.length > 0 && (
              <section aria-labelledby="starred-albums-heading" style={{ marginBottom: 40 }}>
                <h2 className="library-section-title" id="starred-albums-heading">
                  Starred Albums
                  <span className="section-meta" style={{ marginLeft: 10 }}>{albums.length}</span>
                </h2>
                <div className="albums-grid" role="list" aria-label="Starred albums">
                  {albums.map(album => (
                    <AlbumCard key={album.id} album={album} onPlay={playAlbum} onClick={a => navigate(`/album/${a.id}`)} />
                  ))}
                </div>
              </section>
            )}

            {songs.length > 0 && (
              <section aria-labelledby="starred-songs-heading">
                <h2 className="library-section-title" id="starred-songs-heading">
                  Starred Songs
                  <span className="section-meta" style={{ marginLeft: 10 }}>{songs.length}</span>
                </h2>
                <div className="library-song-list">
                  <div className="pl-track-list-header">
                    <div className="track-list-header-label" style={{ textAlign: 'center' }}>#</div>
                    <div className="track-list-header-label">Title</div>
                    <div className="track-list-header-label">Album</div>
                    <div className="track-list-header-label right">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                        <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
                      </svg>
                    </div>
                  </div>
                  <div role="list">
                    {songs.map((song, idx) => {
                      const playing = currentTrack?.id === song.id;
                      return (
                        <div
                          key={song.id}
                          className={`pl-track-row${playing ? ' playing' : ''}`}
                          role="listitem"
                          tabIndex={0}
                          aria-label={`${song.title} by ${song.artist}`}
                          onClick={() => playTrack(song, songs, idx)}
                          onKeyDown={e => e.key === 'Enter' && playTrack(song, songs, idx)}
                          onContextMenu={e => openMenu(e, song)}
                        >
                          <div className="track-num">
                            {playing && isPlaying ? (
                              <div className="playing-bars"><span /><span /><span /></div>
                            ) : (
                              idx + 1
                            )}
                          </div>
                          <div className="track-play-icon" aria-hidden="true">
                            <IconPlay size={14} />
                          </div>
                          <div className="pl-track-main">
                            <div className="pl-track-info">
                              <div className="track-title">{song.title}</div>
                              <div className="track-artist">{song.artist}</div>
                            </div>
                          </div>
                          <div
                            className="pl-track-album"
                            onClick={e => { e.stopPropagation(); navigate(`/album/${song.albumId}`); }}
                          >
                            {song.album}
                          </div>
                          <div className="track-meta">
                            <TrackMoreButton song={song} />
                            <span>{fmt(song.duration)}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </section>
            )}
          </>
        )}
      </div>
      {menuPortal}
    </>
  );
}
