import { useEffect, useState } from 'react';

/**
 * Extracts two dominant colors from an image URL using canvas pixel sampling.
 * Returns a [colorA, colorB] tuple, or the provided fallback while loading.
 */
export function useImageColors(
  src: string | undefined,
  fallback: [string, string]
): [string, string] {
  const [colors, setColors] = useState<[string, string]>(fallback);

  useEffect(() => {
    if (!src) {
      setColors(fallback);
      return;
    }

    let cancelled = false;
    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      if (cancelled) return;
      try {
        const canvas = document.createElement('canvas');
        const size = 64;
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) return;

        ctx.drawImage(img, 0, 0, size, size);
        const data = ctx.getImageData(0, 0, size, size).data;

        // Sample regions: top-left quadrant for colorA, bottom-right for colorB
        const colorA = averageRegion(data, size, 0, 0, size / 2, size / 2);
        const colorB = averageRegion(data, size, size / 2, size / 2, size, size);

        if (!cancelled) {
          setColors([toHex(colorA), toHex(colorB)]);
        }
      } catch {
        // Canvas tainted or other error — keep fallback
      }
    };

    img.onerror = () => {
      if (!cancelled) setColors(fallback);
    };

    img.src = src;

    return () => { cancelled = true; };
  }, [src]);

  return colors;
}

function averageRegion(
  data: Uint8ClampedArray,
  stride: number,
  x0: number, y0: number,
  x1: number, y1: number
): [number, number, number] {
  let r = 0, g = 0, b = 0, count = 0;
  for (let y = Math.floor(y0); y < Math.floor(y1); y++) {
    for (let x = Math.floor(x0); x < Math.floor(x1); x++) {
      const i = (y * stride + x) * 4;
      r += data[i];
      g += data[i + 1];
      b += data[i + 2];
      count++;
    }
  }
  if (count === 0) return [100, 100, 100];
  return [Math.round(r / count), Math.round(g / count), Math.round(b / count)];
}

function toHex([r, g, b]: [number, number, number]): string {
  return '#' + [r, g, b].map(c => c.toString(16).padStart(2, '0')).join('');
}
