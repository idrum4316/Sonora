import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { IconClose } from './ui';

interface ImageLightboxProps {
  src: string | null | undefined;
  alt: string;
  open: boolean;
  onClose: () => void;
}

/**
 * Full-viewport image viewer. Renders nothing when closed or when src is missing.
 * Closes on Escape, backdrop click, or the close button. Body scroll is locked
 * while open.
 *
 * Rendered via a React portal directly to <body> so its `position: fixed` is
 * always resolved against the viewport — not against any transformed ancestor
 * (e.g. the page-transition wrapper), which would otherwise trap the lightbox
 * inside the scroll container.
 */
export function ImageLightbox({ src, alt, open, onClose }: ImageLightboxProps) {
  useEffect(() => {
    if (!open) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onClose]);

  if (!open || !src) return null;

  return createPortal(
    <div
      className="image-lightbox"
      role="dialog"
      aria-modal="true"
      aria-label={alt}
      onClick={onClose}
    >
      <button
        className="image-lightbox-close"
        onClick={(e) => { e.stopPropagation(); onClose(); }}
        aria-label="Close image viewer"
        autoFocus
      >
        <IconClose />
      </button>
      <img
        className="image-lightbox-img"
        src={src}
        alt={alt}
        onClick={(e) => e.stopPropagation()}
      />
    </div>,
    document.body,
  );
}
