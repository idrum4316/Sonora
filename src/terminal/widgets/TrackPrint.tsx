import { useStore } from '../../core/store';
import type { Song } from '../../core/subsonic';
import { ROW_HEIGHT } from '../nav';

/** Bars are a cell apart, so past this they'd take the room the album's name needs. */
const MAX_TRACKS = 32;
/** A row divides into eighths, as block characters divide it, and the bars can be three rows tall. */
const STEP_HEIGHT = ROW_HEIGHT / 8;
const STEPS = 24;

interface TrackPrintProps {
  songs: Song[];
  /** The row whose bar to pick out, if the cursor is in this list. */
  selected: number | null;
  stale: boolean;
}

/**
 * A bar per track, as tall as the track is long. There's no cover art in this UI, so this is what
 * gives each album a shape of its own. It's real data, and it lights up as the music moves through it.
 */
export function TrackPrint({ songs, selected, stale }: TrackPrintProps) {
  const currentId = useStore(s => s.currentTrack?.id);
  if (songs.length < 2 || songs.length > MAX_TRACKS) return null;
  const longest = Math.max(...songs.map(song => song.duration), 1);
  return (
    <span className={`t-print${stale ? ' is-stale' : ''}`} aria-hidden="true">
      {songs.map((song, index) => (
        <i
          key={`${song.id}-${index}`}
          className={song.id === currentId ? 'is-current' : index === selected ? 'is-selected' : undefined}
          style={{ height: Math.max(1, Math.round((song.duration / longest) * STEPS)) * STEP_HEIGHT }}
        />
      ))}
    </span>
  );
}
