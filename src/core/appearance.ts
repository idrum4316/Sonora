import { currentArtColors, loadArtPalette, useArtPalette } from './artPalette';
import { useStore } from './store';

const ACCENT_VARS = ['--accent', '--accent-dim', '--accent-hover'] as const;

/**
 * Applies the stored theme and accent to <html> now and whenever they change.
 * Call before the first render so the page doesn't flash the default theme.
 * Returns a function that stops syncing.
 *
 * The album accent has no rule in tokens.css, so it shows the default accent until the cover art's
 * colors load, and whenever the art has none. Its colors are set inline, over the stylesheet's.
 */
export function startAppearanceSync(): () => void {
  const root = document.documentElement;
  let applied: string | null = null;

  const apply = () => {
    // The store changes on every audio tick, so only touch the DOM on a real change.
    const { theme, accentColor, config, currentTrack } = useStore.getState();
    if (root.dataset.theme !== theme) root.dataset.theme = theme;
    if (root.dataset.accent !== accentColor) root.dataset.accent = accentColor;

    const fromArt = accentColor === 'album';
    // Only fetch art for the album accent, so other accents cost nothing.
    loadArtPalette(fromArt ? config : null, currentTrack?.coverArt);
    const colors = fromArt ? currentArtColors() : null;
    const key = colors ? `${colors.accent}${colors.dim}${colors.hover}` : null;
    if (key === applied) return;
    applied = key;
    if (colors) {
      root.style.setProperty('--accent', colors.accent);
      root.style.setProperty('--accent-dim', colors.dim);
      root.style.setProperty('--accent-hover', colors.hover);
    } else {
      for (const name of ACCENT_VARS) root.style.removeProperty(name);
    }
  };
  apply();
  const unsubscribeStore = useStore.subscribe(apply);
  const unsubscribePalette = useArtPalette.subscribe(apply);
  return () => {
    unsubscribeStore();
    unsubscribePalette();
  };
}
