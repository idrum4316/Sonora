export const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Runs a change to the whole page's colors as a crossfade, where the browser can. */
export function crossfade(change: () => void) {
  if (!document.startViewTransition || reducedMotion()) {
    change();
    return;
  }
  // `ready` rejects when another change cuts this one short, which is fine: the page still updates.
  document.startViewTransition(change).ready.catch(() => {});
}
