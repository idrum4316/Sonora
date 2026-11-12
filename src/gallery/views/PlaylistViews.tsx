import { useEffect, useMemo, useState } from 'react';
import { fmtDuration, plural } from '../../core/format';
import { useStore } from '../../core/store';
import { getPlaylist, getPlaylists, removeFromPlaylist, type Playlist, type PlaylistDetail, type Song } from '../../core/subsonic';
import { paletteStyle, usePalette } from '../hooks';
import { playlistPath } from '../router';
import { useUi } from '../ui';
import { Cover, CoverCard } from '../widgets/Cover';
import { AddIcon, PlayIcon, ShuffleIcon } from '../widgets/Icons';
import { ownsPlaylist } from '../widgets/PlaylistPicker';
import { displayClass, HeroArt, shuffled, TrackList, Wash } from './parts';

export function PlaylistsView() {
  const config = useStore(s => s.config);
  const playPlaylist = useStore(s => s.playPlaylist);
  const playlistVersion = useStore(s => s.playlistVersion);
  const [playlists, setPlaylists] = useState<Playlist[] | null>(null);

  useEffect(() => {
    if (!config) return;
    let live = true;
    getPlaylists(config).then(p => live && setPlaylists(p)).catch(() => live && setPlaylists([]));
    document.title = 'Playlists · Sonora Gallery';
    return () => { live = false; };
  }, [config, playlistVersion]);

  const lead = playlists?.find(p => p.coverArt)?.coverArt;
  const palette = usePalette(lead);

  return (
    <div className="g-page g-playlists-page" style={paletteStyle(palette)}>
      <Wash coverArt={lead} />
      <header className="g-page-head">
        <span className="g-eyebrow">Collections</span>
        <h1 className="g-display">Playlists</h1>
        {playlists && <p className="g-facts g-mono"><span>{plural(playlists.length, 'playlist')}</span></p>}
      </header>
      {playlists === null && <div className="g-grid is-loading">{Array.from({ length: 8 }, (_, i) => <span key={i} />)}</div>}
      {playlists?.length === 0 && <p className="g-empty">No playlists on this server yet.</p>}
      <div className="g-grid is-large">
        {playlists?.map(p => (
          <CoverCard
            key={p.id}
            coverArt={p.coverArt}
            title={p.name}
            subtitle={<span className="g-mono">{plural(p.songCount, 'track')} · {fmtDuration(p.duration)}</span>}
            path={playlistPath(p.id)}
            action={
              <button className="g-play is-floating" onClick={() => void playPlaylist(p)} aria-label={`Play ${p.name}`}>
                <PlayIcon size={20} />
              </button>
            }
          />
        ))}
      </div>
    </div>
  );
}

export function PlaylistView({ id }: { id: string }) {
  const config = useStore(s => s.config);
  const playlistVersion = useStore(s => s.playlistVersion);
  const { playTrack, addMultipleToQueue } = useStore.getState();
  const showToast = useUi(s => s.showToast);
  const [playlist, setPlaylist] = useState<PlaylistDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [removing, setRemoving] = useState(false);

  // Fetched again whenever a playlist changes, as adding to this one from its own tracks would.
  useEffect(() => {
    if (!config) return;
    let live = true;
    getPlaylist(config, id)
      .then(p => { if (live) { setPlaylist(p); document.title = `${p.name} · Sonora Gallery`; } })
      .catch(e => live && setError(e instanceof Error ? e.message : 'Could not load this playlist'));
    return () => { live = false; };
  }, [config, id, playlistVersion]);

  const editable = !!playlist && ownsPlaylist(playlist, config?.username);

  /**
   * Tracks are removed by position, and this list may have been loaded a while ago. So check the
   * position still holds this song first, or a playlist edited elsewhere would lose the wrong track.
   */
  const remove = async (song: Song, index: number) => {
    if (!config || !playlist || removing) return;
    setRemoving(true);
    try {
      const current = await getPlaylist(config, id);
      if (current.entry?.[index]?.id === song.id) {
        await removeFromPlaylist(config, id, [index]);
        showToast(`Removed ${song.title} from ${playlist.name}`);
      } else {
        showToast(`${playlist.name} changed on the server, so nothing was removed`);
      }
    } catch (e) {
      showToast(`Couldn't remove ${song.title}: ${e instanceof Error ? e.message : 'the server said no'}`);
    }
    // Reloads this list, with the server's positions, and the playlists page's counts.
    useStore.getState().bumpPlaylistVersion();
    setRemoving(false);
  };

  const songs = playlist?.entry ?? [];
  // The playlist pictured by the albums it draws from, nine at most.
  const covers = useMemo(() => {
    const seen = new Set<string>();
    const out: string[] = [];
    for (const s of songs) {
      if (s.coverArt && !seen.has(s.albumId)) {
        seen.add(s.albumId);
        out.push(s.coverArt);
      }
      if (out.length === 9) break;
    }
    return out;
  }, [songs]);
  const grid = covers.length >= 9 ? 9 : covers.length >= 4 ? 4 : 0;
  const palette = usePalette(covers[0] ?? playlist?.coverArt);

  if (error && !playlist) return <div className="g-page"><p className="g-page-error">{error}</p></div>;

  return (
    <div className="g-page g-album-page" style={paletteStyle(palette)}>
      <Wash coverArt={covers[0] ?? playlist?.coverArt} />
      <div className="g-spread">
        <div className="g-spread-art">
          <HeroArt coverArt={grid ? undefined : playlist?.coverArt} glowArt={covers[0]} landing={playlist?.coverArt} alt={playlist?.name ?? ''}>
            {grid > 0 && (
              <div className={`g-quad ${grid === 9 ? 'is-nine' : 'is-four'}`}>
                {covers.slice(0, grid).map(c => <Cover key={c} coverArt={c} size={grid === 9 ? 400 : 600} eager />)}
              </div>
            )}
          </HeroArt>
        </div>
        <div className="g-spread-info">
          <span className="g-eyebrow">Playlist{playlist?.owner ? ` · by ${playlist.owner}` : ''}</span>
          <h1 className={displayClass(playlist?.name)}>{playlist?.name ?? ' '}</h1>
          {playlist?.comment && <p className="g-lede">{playlist.comment}</p>}
          <p className="g-facts g-mono">
            {playlist && <span>{plural(songs.length, 'track')}</span>}
            {playlist && <span>{fmtDuration(playlist.duration)}</span>}
          </p>
          <div className="g-actions">
            <button className="g-pill is-accent is-big" disabled={!songs.length} onClick={() => playTrack(songs[0], songs, 0)}><PlayIcon size={18} /> Play</button>
            <button className="g-pill is-big" disabled={!songs.length} onClick={() => { const s = shuffled(songs); playTrack(s[0], s, 0); }}><ShuffleIcon size={18} /> Shuffle</button>
            <button className="g-pill is-big" disabled={!songs.length} onClick={() => { addMultipleToQueue(songs); showToast(`Queued ${playlist?.name}`); }}><AddIcon size={18} /> Queue</button>
          </div>
          {playlist ? <TrackList songs={songs} mixed onRemove={editable ? remove : undefined} removing={removing} /> : <div className="g-tracks is-loading">{Array.from({ length: 8 }, (_, i) => <span key={i} />)}</div>}
        </div>
      </div>
    </div>
  );
}
