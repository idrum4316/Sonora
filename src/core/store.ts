import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { SubsonicConfig, Song } from './subsonic';
import { getAlbum, getPlaylist, getStreamUrl, star, unstar } from './subsonic';
import { audio } from './audio';

export type RepeatMode = 'none' | 'one' | 'all';
export type ThemeMode = 'dark' | 'light';

export type AccentColor =
  | 'sunset'
  | 'amber'
  | 'rose'
  | 'violet'
  | 'indigo'
  | 'sky'
  | 'teal'
  | 'emerald';

export const ACCENT_COLORS: { id: AccentColor; label: string; swatch: string }[] = [
  { id: 'sunset',  label: 'Sunset',  swatch: '#E07A5F' },
  { id: 'amber',   label: 'Amber',   swatch: '#F0A93B' },
  { id: 'rose',    label: 'Rose',    swatch: '#EC6A88' },
  { id: 'violet',  label: 'Violet',  swatch: '#9F8BFF' },
  { id: 'indigo',  label: 'Indigo',  swatch: '#7B8CFF' },
  { id: 'sky',     label: 'Sky',     swatch: '#56B9F2' },
  { id: 'teal',    label: 'Teal',    swatch: '#4FC9C0' },
  { id: 'emerald', label: 'Emerald', swatch: '#5CCB8A' },
];

interface StoreState {
  // ── Connection ────────────────────────────────────────────────
  config: SubsonicConfig | null;
  isConnected: boolean;

  // ── Settings ─────────────────────────────────────────────────
  scrobbleThreshold: number; // 0–100, percent of track to play before scrobbling
  theme: ThemeMode;
  accentColor: AccentColor;

  // ── UI ────────────────────────────────────────────────────────
  showNowPlaying: boolean;

  // ── Playlists (cache-bust counter) ────────────────────────────
  playlistVersion: number;
  bumpPlaylistVersion: () => void;

  // ── Playback ──────────────────────────────────────────────────
  currentTrack: Song | null;
  queue: Song[];
  queueIndex: number;
  playHistory: Song[];
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  isMuted: boolean;
  shuffle: boolean;
  repeat: RepeatMode;

  // ── Actions ───────────────────────────────────────────────────
  setConfig: (config: SubsonicConfig) => void;
  clearConfig: () => void;
  toggleNowPlaying: () => void;

  playTrack: (song: Song, queue?: Song[], index?: number) => void;
  /** Fetches the album and plays it from the start. Resolves false if it's empty or the fetch fails. */
  playAlbum: (album: { id: string }) => Promise<boolean>;
  /** Fetches the playlist and plays it from the start. Resolves false if it's empty or the fetch fails. */
  playPlaylist: (playlist: { id: string }) => Promise<boolean>;
  /** Toggles pause if `song` is the current track, otherwise plays it from `queue` at `index`. */
  playOrToggle: (song: Song, queue: Song[], index: number) => void;
  pause: () => void;
  resume: () => void;
  togglePlay: () => void;
  next: () => void;
  prev: () => void;
  seekTo: (time: number) => void;
  setVolume: (volume: number) => void;
  toggleMute: () => void;
  toggleShuffle: () => void;
  setRepeat: (mode: RepeatMode) => void;
  cycleRepeat: () => void;
  setTheme: (theme: ThemeMode) => void;
  toggleTheme: () => void;
  setAccentColor: (accent: AccentColor) => void;
  setCurrentTime: (t: number) => void;
  setDuration: (d: number) => void;
  setIsPlaying: (v: boolean) => void;
  starCurrentTrack: () => void;
  /** Stars or unstars a song, updating the current track and queue right away. Resolves false and reverts on failure. */
  setSongStarred: (id: string, starred: boolean) => Promise<boolean>;
  setScrobbleThreshold: (v: number) => void;
  addToQueue: (song: Song) => void;
  addMultipleToQueue: (songs: Song[]) => void;
  playNext: (song: Song) => void;
  playMultipleNext: (songs: Song[]) => void;
  clearQueue: () => void;
  removeFromQueue: (index: number) => void;
  moveInQueue: (from: number, to: number) => void;
}

export const useStore = create<StoreState>()(
  persist(
    (set, get) => ({
      config: null,
      isConnected: false,
      showNowPlaying: false,
      playlistVersion: 0,
      scrobbleThreshold: 75,
      theme: 'dark',
      accentColor: 'sunset',
      currentTrack: null,
      queue: [],
      queueIndex: 0,
      playHistory: [],
      isPlaying: false,
      currentTime: 0,
      duration: 0,
      volume: 0.8,
      isMuted: false,
      shuffle: false,
      repeat: 'none',

      toggleNowPlaying: () => set(s => ({ showNowPlaying: !s.showNowPlaying })),
      bumpPlaylistVersion: () => set(s => ({ playlistVersion: s.playlistVersion + 1 })),

      setConfig: (config) => {
        set({ config, isConnected: true });
      },

      clearConfig: () => {
        audio.pause();
        audio.src = '';
        set({ config: null, isConnected: false, currentTrack: null, queue: [], isPlaying: false });
      },

      playTrack: (song, queue, index) => {
        const { config } = get();
        if (!config) return;
        const newQueue = queue ?? get().queue;
        const newIndex = index ?? newQueue.findIndex(s => s.id === song.id);
        audio.src = getStreamUrl(config, song.id);
        audio.volume = get().isMuted ? 0 : get().volume;
        audio.play().catch(console.error);
        set({
          currentTrack: song,
          queue: newQueue,
          queueIndex: newIndex >= 0 ? newIndex : 0,
          isPlaying: true,
        });
      },

      playAlbum: async ({ id }) => {
        const { config } = get();
        if (!config) return false;
        try {
          const detail = await getAlbum(config, id);
          if (!detail.song?.length) return false;
          get().playTrack(detail.song[0], detail.song, 0);
          return true;
        } catch (e) {
          console.error(e);
          return false;
        }
      },

      playPlaylist: async ({ id }) => {
        const { config } = get();
        if (!config) return false;
        try {
          const detail = await getPlaylist(config, id);
          if (!detail.entry?.length) return false;
          get().playTrack(detail.entry[0], detail.entry, 0);
          return true;
        } catch (e) {
          console.error(e);
          return false;
        }
      },

      playOrToggle: (song, queue, index) => {
        if (get().currentTrack?.id === song.id) get().togglePlay();
        else get().playTrack(song, queue, index);
      },

      pause: () => { audio.pause(); set({ isPlaying: false }); },
      resume: () => { audio.play().catch(console.error); set({ isPlaying: true }); },

      togglePlay: () => {
        if (!get().currentTrack) return;
        if (get().isPlaying) get().pause();
        else get().resume();
      },

      next: () => {
        const { queue, queueIndex, shuffle, repeat, currentTrack, playHistory } = get();
        if (!queue.length) return;
        if (currentTrack) {
          set({ playHistory: [currentTrack, ...playHistory].slice(0, 50) });
        }
        let nextIdx: number;
        if (shuffle) {
          nextIdx = Math.floor(Math.random() * queue.length);
        } else if (queueIndex < queue.length - 1) {
          nextIdx = queueIndex + 1;
        } else if (repeat === 'all') {
          nextIdx = 0;
        } else {
          return;
        }
        get().playTrack(queue[nextIdx], queue, nextIdx);
      },

      prev: () => {
        const { queue, queueIndex, currentTime, currentTrack, playHistory } = get();
        if (!queue.length) return;
        if (currentTime > 3) {
          audio.currentTime = 0;
          return;
        }
        if (currentTrack) {
          set({ playHistory: [currentTrack, ...playHistory].slice(0, 50) });
        }
        const prevIdx = queueIndex > 0 ? queueIndex - 1 : 0;
        get().playTrack(queue[prevIdx], queue, prevIdx);
      },

      seekTo: (time) => {
        audio.currentTime = time;
        set({ currentTime: time });
      },

      setVolume: (volume) => {
        audio.volume = volume;
        set({ volume, isMuted: volume === 0 });
      },

      toggleMute: () => {
        const { isMuted, volume } = get();
        const newMuted = !isMuted;
        audio.volume = newMuted ? 0 : volume;
        set({ isMuted: newMuted });
      },

      toggleShuffle: () => set(s => ({ shuffle: !s.shuffle })),

      setRepeat: (mode) => set({ repeat: mode }),

      cycleRepeat: () => {
        const modes: RepeatMode[] = ['none', 'all', 'one'];
        set(s => ({ repeat: modes[(modes.indexOf(s.repeat) + 1) % modes.length] }));
      },

      setTheme: (theme) => set({ theme }),
      toggleTheme: () => set(s => ({ theme: s.theme === 'dark' ? 'light' : 'dark' })),
      setAccentColor: (accent) => set({ accentColor: accent }),

      setCurrentTime: (t) => set({ currentTime: t }),
      setDuration: (d) => set({ duration: d }),
      setIsPlaying: (v) => set({ isPlaying: v }),

      starCurrentTrack: () => {
        const { currentTrack } = get();
        if (currentTrack) void get().setSongStarred(currentTrack.id, !currentTrack.starred);
      },

      setSongStarred: async (id, starred) => {
        const { config } = get();
        if (!config) return false;
        const patch = (value: string | undefined) => set(s => ({
          currentTrack: s.currentTrack?.id === id ? { ...s.currentTrack, starred: value } : s.currentTrack,
          queue: s.queue.map(song => song.id === id ? { ...song, starred: value } : song),
        }));
        const timestamp = new Date().toISOString();
        patch(starred ? timestamp : undefined);
        try {
          await (starred ? star(config, id) : unstar(config, id));
          return true;
        } catch {
          patch(starred ? undefined : timestamp);
          return false;
        }
      },

      setScrobbleThreshold: (v) => set({ scrobbleThreshold: v }),

      addToQueue: (song: Song) => {
        set(s => ({ queue: [...s.queue, song] }));
      },

      addMultipleToQueue: (songs: Song[]) => {
        if (!songs.length) return;
        set(s => ({ queue: [...s.queue, ...songs] }));
      },

      playNext: (song: Song) => {
        const { queue, queueIndex } = get();
        const insertAt = queueIndex + 1;
        const newQueue = [...queue];
        newQueue.splice(insertAt, 0, song);
        set({ queue: newQueue });
      },

      playMultipleNext: (songs: Song[]) => {
        if (!songs.length) return;
        const { queue, queueIndex } = get();
        const insertAt = queueIndex + 1;
        const newQueue = [...queue];
        newQueue.splice(insertAt, 0, ...songs);
        set({ queue: newQueue });
      },

      clearQueue: () => {
        const { currentTrack } = get();
        if (currentTrack) {
          set({ queue: [currentTrack], queueIndex: 0 });
        } else {
          set({ queue: [], queueIndex: 0 });
        }
      },

      removeFromQueue: (index: number) => {
        const { queue, queueIndex } = get();
        if (index < 0 || index >= queue.length || index === queueIndex) return;
        const newQueue = queue.filter((_, i) => i !== index);
        const newIdx = index < queueIndex ? queueIndex - 1 : queueIndex;
        set({ queue: newQueue, queueIndex: newIdx });
      },

      moveInQueue: (from: number, to: number) => {
        const { queue, queueIndex } = get();
        if (from < 0 || from >= queue.length || to < 0 || to > queue.length) return;
        if (from === to || from + 1 === to) return;
        const newQueue = [...queue];
        const [moved] = newQueue.splice(from, 1);
        const insertAt = from < to ? to - 1 : to;
        newQueue.splice(insertAt, 0, moved);
        let newIdx = queueIndex;
        if (from === queueIndex) {
          newIdx = insertAt;
        } else {
          if (from < queueIndex) newIdx--;
          if (insertAt <= newIdx) newIdx++;
        }
        set({ queue: newQueue, queueIndex: newIdx });
      },
    }),
    {
      name: 'sonora-store',
      partialize: (s) => ({
        config: s.config,
        isConnected: s.isConnected,
        volume: s.volume,
        shuffle: s.shuffle,
        repeat: s.repeat,
        scrobbleThreshold: s.scrobbleThreshold,
        theme: s.theme,
        accentColor: s.accentColor,
      }),
    }
  )
);
