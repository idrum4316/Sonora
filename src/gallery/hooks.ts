import { useEffect, useMemo, useState } from 'react';
import { useStore } from '../core/store';
import { ensureSample, getSample, paletteOf, useSamples, type Palette } from './art';
import { useLight } from './theme';

/**
 * The colors of a cover, fitted to the theme, read on demand. Neutral until they're known, and when they
 * can't be read.
 */
export function usePalette(coverArt: string | undefined): Palette {
  // Re-render as samples arrive, then pick this cover's out of them.
  useSamples(s => s.version);
  const [, setLoaded] = useState(0);
  useEffect(() => {
    let live = true;
    void ensureSample(coverArt).then(() => { if (live) setLoaded(n => n + 1); });
    return () => { live = false; };
  }, [coverArt]);
  const light = useLight();
  const sample = getSample(coverArt);
  return useMemo(() => paletteOf(sample, light), [sample, light]);
}

/** The playing track's colors. */
export function useNowPalette(): Palette {
  return usePalette(useStore(s => s.currentTrack?.coverArt));
}

/** CSS custom properties that tint a view with a palette. */
export function paletteStyle(p: Palette): Record<string, string> {
  return { '--p-accent': p.accent, '--p-deep': p.deep, '--p-deep2': p.deep2 };
}

/** True after the pointer and keys have been still for `ms`, for views that hide their controls. */
export function useIdle(ms: number, enabled = true): boolean {
  const [idle, setIdle] = useState(false);
  useEffect(() => {
    if (!enabled) { setIdle(false); return; }
    let timer = window.setTimeout(() => setIdle(true), ms);
    const wake = () => {
      setIdle(false);
      clearTimeout(timer);
      timer = window.setTimeout(() => setIdle(true), ms);
    };
    const events = ['pointermove', 'pointerdown', 'keydown', 'wheel'] as const;
    events.forEach(e => window.addEventListener(e, wake, { passive: true }));
    return () => {
      clearTimeout(timer);
      events.forEach(e => window.removeEventListener(e, wake));
    };
  }, [ms, enabled]);
  return idle;
}
