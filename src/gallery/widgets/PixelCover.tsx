import { useEffect, useRef } from 'react';
import { coverUrl } from '../art';
import { reducedMotion } from '../motion';

/**
 * Cover art that changes like a screen does: the old cover breaks into ever larger pixels, holds as a
 * coarse mosaic while the new one loads, then the new one resolves out of its own pixels, in whole steps.
 */

/** Pixel sizes, as a fraction of the cover, from sharp to coarse. */
const STEPS = [0, 1 / 160, 1 / 80, 1 / 40, 1 / 20, 1 / 10];
const STEP_MS = 55;

interface Props {
  coverArt?: string;
  className?: string;
  /** Size to fetch. */
  fetchSize?: number;
}

export function PixelCover({ coverArt, className, fetchSize = 1000 }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const state = useRef({
    shown: null as HTMLImageElement | null,
    step: 0,
    timer: 0,
    want: '',
    redraw: () => {},
  });

  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext('2d')!;
    const small = document.createElement('canvas');
    const s = state.current;

    const draw = () => {
      const W = canvas.width;
      if (!W) return;
      ctx.clearRect(0, 0, W, W);
      const img = s.shown;
      if (!img) return;
      const step = STEPS[s.step];
      if (!step) {
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, W, W);
        return;
      }
      const n = Math.max(2, Math.round(1 / step));
      small.width = n;
      small.height = n;
      const sctx = small.getContext('2d')!;
      sctx.imageSmoothingEnabled = true;
      sctx.drawImage(img, 0, 0, n, n);
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(small, 0, 0, W, W);
    };
    s.redraw = draw;

    const resize = new ResizeObserver(() => {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = canvas.height = Math.round(rect.width * dpr);
      draw();
    });
    resize.observe(canvas);
    return () => {
      resize.disconnect();
      clearInterval(s.timer);
    };
  }, []);

  useEffect(() => {
    const s = state.current;
    const url = coverArt ? coverUrl(coverArt, fetchSize) : '';
    if (url === s.want) return;
    s.want = url;
    clearInterval(s.timer);
    const still = reducedMotion();

    let incoming: HTMLImageElement | null = null;
    let outDone = !s.shown || still;
    let loaded = false;

    const resolveIn = () => {
      s.shown = incoming;
      if (still) {
        s.step = 0;
        s.redraw();
        return;
      }
      s.step = STEPS.length - 1;
      s.redraw();
      clearInterval(s.timer);
      s.timer = window.setInterval(() => {
        s.step = Math.max(0, s.step - 1);
        s.redraw();
        if (!s.step) clearInterval(s.timer);
      }, STEP_MS * 1.4);
    };

    if (!outDone) {
      s.timer = window.setInterval(() => {
        s.step = Math.min(STEPS.length - 1, s.step + 1);
        s.redraw();
        if (s.step === STEPS.length - 1) {
          clearInterval(s.timer);
          outDone = true;
          if (loaded) resolveIn();
        }
      }, STEP_MS);
    }

    if (!url) {
      s.shown = null;
      s.redraw();
      return;
    }
    const img = new Image();
    img.decoding = 'async';
    img.onload = () => {
      if (s.want !== url) return;
      incoming = img;
      loaded = true;
      if (outDone) resolveIn();
    };
    img.onerror = () => {
      if (s.want !== url) return;
      clearInterval(s.timer);
      s.shown = null;
      s.step = 0;
      s.redraw();
    };
    img.src = url;
  }, [coverArt, fetchSize]);

  return <canvas ref={canvasRef} className={className} role="img" aria-label="Cover art" />;
}
