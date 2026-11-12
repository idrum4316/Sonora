import { useStore, type ThemeMode } from '../core/store';
import { reducedMotion } from './motion';

/**
 * The gallery follows the theme the other UIs share, dark or light. It still ignores their accent:
 * color comes from the art, fitted to the ground it sits on.
 */

/** The browser chrome's color, matching --g-bg in gallery.css. */
const CHROME: Record<ThemeMode, string> = { dark: '#050507', light: '#f3f1ec' };

export const isLight = () => useStore.getState().theme === 'light';

/** True while the gallery is light. */
export const useLight = () => useStore(s => s.theme === 'light');

/** Applies the stored theme to <html> now and whenever it changes. Call before the first render. */
export function startThemeSync(): void {
  const root = document.documentElement;
  const meta = document.querySelector('meta[name="theme-color"]');
  const apply = (theme: ThemeMode) => {
    if (root.dataset.theme !== theme) root.dataset.theme = theme;
    meta?.setAttribute('content', CHROME[theme]);
  };
  apply(useStore.getState().theme);
  useStore.subscribe((s, prev) => { if (s.theme !== prev.theme) apply(s.theme); });
}

/** Flips between dark and light, crossfading the whole screen where the browser can. */
export function switchTheme(): void {
  const flip = () => useStore.getState().toggleTheme();
  if (!document.startViewTransition || reducedMotion()) flip();
  else document.startViewTransition(flip);
}

/** Subscribes to theme changes as they happen, for canvases that must repaint inside the crossfade. */
export function onThemeChange(listener: (light: boolean) => void): () => void {
  return useStore.subscribe((s, prev) => { if (s.theme !== prev.theme) listener(s.theme === 'light'); });
}
