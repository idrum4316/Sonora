import { useEffect, useMemo, useState } from 'react';
import { fmtDuration, plural } from '../../core/format';
import { releaseType } from '../../core/library';
import { useStore } from '../../core/store';
import { getAlbum, getArtist, star, unstar, type Album, type Song } from '../../core/subsonic';
import { getSample, kindred, useSamples } from '../art';
import { paletteStyle, usePalette } from '../hooks';
import { useGallery } from '../library';
import { albumPath } from '../router';
import { useUi } from '../ui';
import { CoverCard } from '../widgets/Cover';
import { AddIcon, HeartIcon, PlayIcon, PlaylistAddIcon, ShuffleIcon } from '../widgets/Icons';
import { ArtistLink, displayClass, Fingerprint, HeroArt, Shelf, shuffled, TrackList, Wash } from './parts';

type AlbumDetail = Album & { song: Song[] };

export function AlbumView({ id }: { id: string }) {
  const config = useStore(s => s.config);
  const known = useGallery(s => s.albums.find(a => a.id === id));
  const library = useGallery(s => s.albums);
  const patchAlbum = useGallery(s => s.patchAlbum);
  const showToast = useUi(s => s.showToast);
  const openPick = useUi(s => s.openPick);
  const { playTrack, addMultipleToQueue } = useStore.getState();
  const [detail, setDetail] = useState<AlbumDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [siblings, setSiblings] = useState<Album[]>([]);
  const [starred, setStarred] = useState<boolean | null>(null);
  // Kindred covers sharpen as more of the library's colors are read.
  const sampleVersion = useSamples(s => s.version);

  useEffect(() => {
    if (!config) return;
    let live = true;
    getAlbum(config, id)
      .then(album => {
        if (!live) return;
        setDetail(album);
        return getArtist(config, album.artistId).then(artist => {
          if (live) setSiblings((artist.album ?? []).filter(a => a.id !== id).sort((a, b) => (b.year ?? 0) - (a.year ?? 0)));
        });
      })
      .catch(e => live && setError(e instanceof Error ? e.message : 'Could not load this album'));
    return () => { live = false; };
  }, [config, id]);

  const album = detail ?? known;
  const coverArt = album?.coverArt;
  const palette = usePalette(coverArt);
  const sample = getSample(coverArt);
  const songs = detail?.song ?? [];
  const isStarred = starred ?? !!album?.starred;
  const total = songs.reduce((t, s) => t + s.duration, 0);
  const similar = useMemo(
    () => (coverArt ? kindred(coverArt, library, 14, a => a.artistId === album?.artistId) : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [coverArt, library, album?.artistId, sample, Math.floor(sampleVersion / 8)],
  );

  useEffect(() => { document.title = album ? `${album.name} · Sonora Gallery` : 'Sonora Gallery'; }, [album]);

  if (error && !album) return <div className="g-page"><p className="g-page-error">{error}</p></div>;

  const toggleStar = async () => {
    if (!config || !album) return;
    const next = !isStarred;
    setStarred(next);
    try {
      await (next ? star(config, album.id) : unstar(config, album.id));
      patchAlbum(album.id, { starred: next ? new Date().toISOString() : undefined });
    } catch {
      setStarred(!next);
    }
  };

  return (
    <div className="g-page g-album-page" style={paletteStyle(palette)}>
      <Wash coverArt={coverArt} />
      <div className="g-spread">
        <div className="g-spread-art">
          <HeroArt coverArt={coverArt} alt={album?.name ?? ''} />
        </div>
        <div className="g-spread-info">
          <span className="g-eyebrow">
            {songs.length ? releaseType(songs.length) : 'Album'}{album?.year ? ` · ${album.year}` : ''}
          </span>
          <h1 className={displayClass(album?.name)}>{album?.name ?? ' '}</h1>
          {album && <ArtistLink id={album.artistId} name={album.artist} />}
          <p className="g-facts g-mono">
            {songs.length > 0 && <span>{plural(songs.length, 'track')}</span>}
            {total > 0 && <span>{fmtDuration(total)}</span>}
            {album?.genre && <span>{album.genre}</span>}
          </p>
          <div className="g-actions">
            <button className="g-pill is-accent is-big" disabled={!songs.length} onClick={() => playTrack(songs[0], songs, 0)}>
              <PlayIcon size={18} /> Play
            </button>
            <button className="g-pill is-big" disabled={!songs.length} onClick={() => { const s = shuffled(songs); playTrack(s[0], s, 0); }}>
              <ShuffleIcon size={18} /> Shuffle
            </button>
            <button className="g-pill is-big" disabled={!songs.length} onClick={() => { addMultipleToQueue(songs); showToast(`Queued ${album?.name}`); }} title="Add to queue">
              <AddIcon size={18} /> Queue
            </button>
            <button
              className="g-icon-btn is-ring"
              disabled={!songs.length}
              onClick={() => album && openPick({ songs, title: album.name, subtitle: album.artist, coverArt: album.coverArt })}
              title="Add album to playlist"
              aria-haspopup="dialog"
            >
              <PlaylistAddIcon size={19} />
            </button>
            <button className={`g-icon-btn is-ring${isStarred ? ' is-on' : ''}`} onClick={toggleStar} aria-pressed={isStarred} title={isStarred ? 'Unfavorite album' : 'Favorite album'}>
              <HeartIcon size={19} filled={isStarred} />
            </button>
          </div>
          <Fingerprint sample={sample} palette={palette} />
          {detail ? <TrackList songs={songs} /> : <div className="g-tracks is-loading">{Array.from({ length: 8 }, (_, i) => <span key={i} />)}</div>}
        </div>
      </div>

      {siblings.length > 0 && album && (
        <Shelf title={`More from ${album.artist}`}>
          {siblings.map(a => (
            <CoverCard key={a.id} coverArt={a.coverArt} title={a.name} subtitle={<span className="g-mono">{a.year ?? ''}</span>} path={albumPath(a.id)} />
          ))}
        </Shelf>
      )}
      {similar.length > 0 && (
        <Shelf title="Kindred colors" note="Covers from other artists that share this palette">
          {similar.map(a => (
            <CoverCard key={a.id} coverArt={a.coverArt} title={a.name} subtitle={a.artist} path={albumPath(a.id)} />
          ))}
        </Shelf>
      )}
    </div>
  );
}
