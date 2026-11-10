import { useEffect, useState } from 'react';
import { plural, stripHtml } from '../../core/format';
import { releaseType } from '../../core/library';
import { useStore } from '../../core/store';
import { getAlbum, getArtist, getArtistInfo, star, unstar, type ArtistDetail, type ArtistInfo, type Song } from '../../core/subsonic';
import { coverUrl, getSample } from '../art';
import { paletteStyle, usePalette } from '../hooks';
import { albumPath, artistPath } from '../router';
import { useUi } from '../ui';
import { Cover, CoverCard } from '../widgets/Cover';
import { HeartIcon, PlayIcon, ShuffleIcon } from '../widgets/Icons';
import { displayClass, Fingerprint, HeroArt, Shelf, shuffled, Wash } from './parts';

/** Last.fm's stand-in star image, which Navidrome passes along when it has no photo. */
const PLACEHOLDER = /2a96cbd8b46e442fc41c2b86b821562f/;

export function ArtistView({ id }: { id: string }) {
  const config = useStore(s => s.config);
  const playTrack = useStore(s => s.playTrack);
  const showToast = useUi(s => s.showToast);
  const [artist, setArtist] = useState<ArtistDetail | null>(null);
  const [info, setInfo] = useState<ArtistInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [bioOpen, setBioOpen] = useState(false);
  const [starred, setStarred] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!config) return;
    let live = true;
    getArtist(config, id)
      .then(a => live && setArtist(a))
      .catch(e => live && setError(e instanceof Error ? e.message : 'Could not load this artist'));
    getArtistInfo(config, id).then(i => live && setInfo(i)).catch(() => {});
    return () => { live = false; };
  }, [config, id]);

  useEffect(() => { document.title = artist ? `${artist.name} · Sonora Gallery` : 'Sonora Gallery'; }, [artist]);

  const albums = [...(artist?.album ?? [])].sort((a, b) => (a.year ?? 0) - (b.year ?? 0));
  const photo = [info?.largeImageUrl, info?.mediumImageUrl, artist?.artistImageUrl].find(u => u && !PLACEHOLDER.test(u));
  // Without a photo, the artist is pictured by their records.
  const leadCover = albums.find(a => a.coverArt)?.coverArt;
  const palette = usePalette(leadCover);
  const sample = getSample(leadCover);
  const bio = info?.biography ? stripHtml(info.biography).replace(/\s*Read more on Last\.fm\.?\s*$/i, '') : '';
  const isStarred = starred ?? !!artist?.starred;
  const similar = (info?.similarArtist ?? []).filter(a => a.id);

  const playAll = async (shuffle: boolean) => {
    if (!config || !albums.length) return;
    setBusy(true);
    try {
      const details = await Promise.all(albums.map(a => getAlbum(config, a.id).catch(() => null)));
      let songs: Song[] = details.flatMap(d => d?.song ?? []);
      if (shuffle) songs = shuffled(songs);
      if (songs.length) playTrack(songs[0], songs, 0);
      else showToast('No tracks found');
    } finally {
      setBusy(false);
    }
  };

  const toggleStar = async () => {
    if (!config || !artist) return;
    const next = !isStarred;
    setStarred(next);
    try {
      await (next ? star(config, artist.id) : unstar(config, artist.id));
    } catch {
      setStarred(!next);
    }
  };

  if (error && !artist) return <div className="g-page"><p className="g-page-error">{error}</p></div>;

  return (
    <div className="g-page g-artist-page" style={paletteStyle(palette)}>
      <Wash coverArt={photo ? undefined : leadCover} src={photo} />
      <div className="g-spread">
        <div className="g-spread-art">
          {photo || !albums.length ? (
            <HeroArt coverArt={artist?.coverArt} src={photo} alt={artist?.name ?? ''} />
          ) : (
            <HeroArt coverArt={undefined} glowArt={leadCover} landing={artist?.coverArt} alt={artist?.name ?? ''}>
              <div className={`g-quad${albums.length >= 4 ? ' is-four' : ''}`}>
                {albums.filter(a => a.coverArt).slice(-4).reverse().map(a => <Cover key={a.id} coverArt={a.coverArt} size={600} eager />)}
              </div>
            </HeroArt>
          )}
        </div>
        <div className="g-spread-info">
          <span className="g-eyebrow">Artist{artist ? ` · ${plural(artist.albumCount ?? albums.length, 'album')}` : ''}</span>
          <h1 className={displayClass(artist?.name)}>{artist?.name ?? ' '}</h1>
          <div className="g-actions">
            <button className="g-pill is-accent is-big" disabled={!albums.length || busy} onClick={() => playAll(false)}>
              <PlayIcon size={18} /> Play all
            </button>
            <button className="g-pill is-big" disabled={!albums.length || busy} onClick={() => playAll(true)}>
              <ShuffleIcon size={18} /> Shuffle
            </button>
            <button className={`g-icon-btn is-ring${isStarred ? ' is-on' : ''}`} onClick={toggleStar} aria-pressed={isStarred} title={isStarred ? 'Unfavorite artist' : 'Favorite artist'}>
              <HeartIcon size={19} filled={isStarred} />
            </button>
          </div>
          {bio && (
            <div className={`g-bio${bioOpen || bio.length <= 420 ? ' is-open' : ''}`}>
              {bio.split(/\n+/).filter(Boolean).map((p, i) => <p key={i}>{p}</p>)}
              {bio.length > 420 && <button className="g-text-btn" onClick={() => setBioOpen(!bioOpen)}>{bioOpen ? 'Less' : 'More'}</button>}
            </div>
          )}
          {!photo && <Fingerprint sample={sample} palette={palette} />}
        </div>
      </div>

      {albums.length > 0 && (
        <section className="g-discography">
          <h2 className="g-section-title">Discography</h2>
          <div className="g-grid">
            {[...albums].reverse().map(a => (
              <CoverCard
                key={a.id}
                coverArt={a.coverArt}
                title={a.name}
                subtitle={<span className="g-mono">{[a.year, releaseType(a.songCount)].filter(Boolean).join(' · ')}</span>}
                path={albumPath(a.id)}
              />
            ))}
          </div>
        </section>
      )}

      {similar.length > 0 && (
        <Shelf title="Kindred artists">
          {similar.map(a => {
            const src = a.artistImageUrl && !PLACEHOLDER.test(a.artistImageUrl) ? a.artistImageUrl : undefined;
            return (
              <CoverCard
                key={a.id}
                coverArt={a.coverArt}
                src={src ?? (a.coverArt ? coverUrl(a.coverArt, 400) : undefined)}
                title={a.name}
                subtitle={a.albumCount ? plural(a.albumCount, 'album') : undefined}
                path={artistPath(a.id)}
              />
            );
          })}
        </Shelf>
      )}
    </div>
  );
}
