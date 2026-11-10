import { create } from 'zustand';
import { useStore } from '../core/store';
import type { Song } from '../core/subsonic';

/** Panels and overlays that sit above every view. */
interface UiState {
  queueOpen: boolean;
  toast: string | null;
  /** Songs starred or unstarred here, which the song objects views hold don't know about yet. */
  starred: Record<string, boolean>;
  setQueueOpen: (open: boolean) => void;
  showToast: (text: string) => void;
  setSongStarred: (id: string, starred: boolean) => void;
}

let toastTimer = 0;

export const useUi = create<UiState>((set, get) => ({
  queueOpen: false,
  toast: null,
  starred: {},
  setQueueOpen: (queueOpen) => set({ queueOpen }),
  showToast: (toast) => {
    clearTimeout(toastTimer);
    set({ toast });
    toastTimer = window.setTimeout(() => set({ toast: null }), 2600);
  },
  setSongStarred: (id, starred) => {
    set(s => ({ starred: { ...s.starred, [id]: starred } }));
    void useStore.getState().setSongStarred(id, starred).then(ok => {
      // Undo only if no later toggle has changed it since.
      if (!ok && get().starred[id] === starred) set(s => ({ starred: { ...s.starred, [id]: !starred } }));
    });
  },
}));

/** Whether a song is starred, counting toggles made anywhere in the gallery. */
export function useIsStarred(song: Song | null | undefined): boolean {
  return useUi(s => (song ? s.starred[song.id] ?? !!song.starred : false));
}
