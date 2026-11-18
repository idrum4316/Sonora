import type { Song } from './subsonic';

/**
 * Whether a track names its own artist beside its title. A track's artist is worth naming when it
 * differs from the album's, since the album already names its artist above the track list.
 */
export function showsTrackArtist(songArtist: string, albumArtist?: string): boolean {
  return !!songArtist && songArtist !== albumArtist;
}

/** What to call a release, going by how many tracks it has. */
export function releaseType(songCount: number): 'Single' | 'EP' | 'Album' {
  if (songCount <= 3) return 'Single';
  if (songCount <= 6) return 'EP';
  return 'Album';
}

export interface Disc {
  number: number;
  /** `index` is the song's position in the input list, which is its queue position. */
  tracks: { song: Song; index: number }[];
}

/** Groups songs by disc in ascending order. A blank or missing disc counts as disc 1. */
export function groupByDisc(songs: Song[]): Disc[] {
  const map = new Map<number, Disc['tracks']>();
  songs.forEach((song, index) => {
    const n = song.discNumber && song.discNumber > 0 ? song.discNumber : 1;
    if (!map.has(n)) map.set(n, []);
    map.get(n)!.push({ song, index });
  });
  return Array.from(map.entries())
    .sort(([a], [b]) => a - b)
    .map(([number, tracks]) => ({ number, tracks }));
}
