import { useCallback, useRef } from 'react';

/**
 * Makes a horizontal slider track draggable via mouse and touch.
 * Returns onMouseDown / onTouchStart handlers to attach to the track element.
 */
export function useSliderDrag(
  trackRef: React.RefObject<HTMLDivElement | null>,
  onChange: (ratio: number) => void,
) {
  const dragging = useRef(false);

  const ratioFromX = useCallback((clientX: number) => {
    const rect = trackRef.current!.getBoundingClientRect();
    return Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
  }, [trackRef]);

  const onMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    dragging.current = true;
    onChange(ratioFromX(e.clientX));

    const onMove = (ev: MouseEvent) => {
      if (dragging.current) onChange(ratioFromX(ev.clientX));
    };
    const onUp = () => {
      dragging.current = false;
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }, [onChange, ratioFromX]);

  const onTouchStart = useCallback((e: React.TouchEvent<HTMLDivElement>) => {
    dragging.current = true;
    onChange(ratioFromX(e.touches[0].clientX));

    const onMove = (ev: TouchEvent) => {
      if (dragging.current) onChange(ratioFromX(ev.touches[0].clientX));
    };
    const onEnd = () => {
      dragging.current = false;
      document.removeEventListener('touchmove', onMove);
      document.removeEventListener('touchend', onEnd);
    };
    document.addEventListener('touchmove', onMove);
    document.addEventListener('touchend', onEnd);
  }, [onChange, ratioFromX]);

  return { onMouseDown, onTouchStart };
}
