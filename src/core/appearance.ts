import { useStore } from './store';

/**
 * Applies the stored theme and accent to <html> now and whenever they change.
 * Call before the first render so the page doesn't flash the default theme.
 * Returns a function that stops syncing.
 */
export function startAppearanceSync(): () => void {
  const root = document.documentElement;
  const apply = () => {
    // The store changes on every audio tick, so only touch the DOM on a real change.
    const { theme, accentColor } = useStore.getState();
    if (root.dataset.theme !== theme) root.dataset.theme = theme;
    if (root.dataset.accent !== accentColor) root.dataset.accent = accentColor;
  };
  apply();
  return useStore.subscribe(apply);
}
