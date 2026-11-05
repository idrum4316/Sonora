import { useStore } from '../../core/store';
import { Spectrum, type CellSize } from './Spectrum';

const CELL: CellSize = { width: 8, height: 4, gapX: 3, gapY: 3 };

/** The top of the now playing view: the track in large type, over a large spectrum. */
export function NowHero() {
  const track = useStore(s => s.currentTrack);
  return (
    <div className="t-now">
      {track ? (
        <div className="t-now-text" key={track.id}>
          <h3 className="t-now-title" title={track.title}>{track.title}</h3>
          <p className="t-now-artist">{track.artist}</p>
          <p className="t-now-album">{[track.album, track.year].filter(Boolean).join(' · ')}</p>
        </div>
      ) : (
        <div className="t-now-text">
          <h3 className="t-now-title is-idle">silence</h3>
          <p className="t-now-album">nothing is playing</p>
        </div>
      )}
      <Spectrum className="t-now-spectrum" cell={CELL} />
    </div>
  );
}
