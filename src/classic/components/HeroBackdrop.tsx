/** A blurred wash of the hero's artwork behind it, fading into the page.
 *  The parent needs `position: relative` and `overflow: hidden`. */
export function HeroBackdrop({ src, opacity = 0.32 }: { src?: string; opacity?: number }) {
  return (
    <>
      {src && (
        <div
          aria-hidden="true"
          style={{
            position: 'absolute', inset: -40,
            backgroundImage: `url(${src})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            filter: 'blur(80px) saturate(1.4)',
            opacity,
            transform: 'scale(1.15)',
            pointerEvents: 'none',
          }}
        />
      )}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(to bottom, transparent 0%, var(--bg) 100%)',
          pointerEvents: 'none',
        }}
      />
    </>
  );
}
