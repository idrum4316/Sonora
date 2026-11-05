import { fmt, fmtDuration } from '../../core/format';
import type { Item } from '../items';
import { ChevronIcon, EqBars, RecentIcon, StarIcon } from './Icons';

interface ItemRowProps {
  item: Item;
  /** Set on the row of the current track. */
  playback?: 'playing' | 'paused';
  /** Shows a tag for the item's type, for lists that mix types. */
  showKind?: boolean;
  /** Lowercase text to pick out in the row's name. */
  highlight?: string;
}

const Star = ({ on }: { on: boolean }) => (
  <span className="t-cell-star">{on && <StarIcon filled label="starred" />}</span>
);
/** The type tag. In mixed lists, non-songs also leave the track column blank so columns line up. */
const Kind = ({ label, show, blankTrack }: { label: string; show?: boolean; blankTrack?: boolean }) =>
  show ? (
    <>
      <span className="t-cell-kind">{label}</span>
      {blankTrack && <span className="t-cell-track" />}
    </>
  ) : null;

const Name = ({ text, highlight }: { text: string; highlight?: string }) => {
  const at = highlight ? text.toLowerCase().indexOf(highlight) : -1;
  if (!highlight || at < 0) return <span className="t-cell-main">{text}</span>;
  const end = at + highlight.length;
  return <span className="t-cell-main">{text.slice(0, at)}<mark>{text.slice(at, end)}</mark>{text.slice(end)}</span>;
};

/** One row of a list. Each field clips to its column, so wide titles can't break the grid. */
export function ItemRow({ item, playback, showKind, highlight }: ItemRowProps) {
  switch (item.kind) {
    case 'album':
      return (
        <>
          <Star on={!!item.album.starred} />
          <Kind label="alb" show={showKind} blankTrack />
          <Name text={item.album.name} highlight={highlight} />
          <span className="t-cell-sub">{item.release ?? item.album.artist}</span>
          <span className="t-cell-num">{item.album.year ?? ''}</span>
        </>
      );
    case 'artist':
      return (
        <>
          <Star on={!!item.artist.starred} />
          <Kind label="art" show={showKind} blankTrack />
          <Name text={item.artist.name} highlight={highlight} />
          <span className="t-cell-num">{item.artist.albumCount ?? ''}</span>
        </>
      );
    case 'playlist':
      return (
        <>
          <Star on={false} />
          <span className="t-cell-main">{item.playlist.name}</span>
          <span className="t-cell-sub">{item.playlist.songCount} {item.playlist.songCount === 1 ? 'track' : 'tracks'}</span>
          <span className="t-cell-num t-cell-wide">{fmtDuration(item.playlist.duration)}</span>
        </>
      );
    case 'genre':
      return (
        <>
          <Star on={false} />
          <span className="t-cell-main">{item.genre.value}</span>
          <span className="t-cell-sub">{item.genre.albumCount} albums</span>
          <span className="t-cell-num t-cell-wide">{item.genre.songCount} tracks</span>
        </>
      );
    case 'song': {
      const { song, disc, sameArtist } = item;
      const track = song.track ? String(song.track).padStart(2, '0') : '';
      return (
        <>
          <Star on={!!song.starred} />
          <Kind label="trk" show={showKind} />
          <span className="t-cell-track">
            {playback ? <EqBars playing={playback === 'playing'} /> : disc && track ? `${disc}-${track}` : track}
          </span>
          <Name text={song.title} highlight={highlight} />
          {!sameArtist && <span className="t-cell-sub">{song.artist}</span>}
          <span className="t-cell-num">{fmt(Math.floor(song.duration))}</span>
        </>
      );
    }
    case 'action':
      return (
        <>
          <span className="t-cell-star t-cell-go"><ChevronIcon /></span>
          <span className={`t-cell-main${item.danger ? ' t-cell-danger' : ''}`}>{item.label}</span>
          {item.swatches && (
            <span className="t-swatches" aria-hidden="true">
              {item.swatches.map(swatch => (
                <i key={swatch.color} className={swatch.on ? 'is-on' : undefined} style={{ color: swatch.color }} />
              ))}
            </span>
          )}
          {item.value && <span className="t-cell-value">{item.value}</span>}
        </>
      );
    case 'link':
      return (
        <>
          <span className="t-cell-star t-cell-go"><ChevronIcon /></span>
          <span className="t-cell-label">{item.label}</span>
          <span className="t-cell-main">{item.value}</span>
        </>
      );
    case 'info':
      return (
        <>
          <span className="t-cell-star" />
          <span className="t-cell-label">{item.label}</span>
          <span className="t-cell-main">{item.value}</span>
        </>
      );
    case 'recent':
      return (
        <>
          <span className="t-cell-star t-cell-go"><RecentIcon /></span>
          <span className="t-cell-main">{item.term}</span>
        </>
      );
  }
}
