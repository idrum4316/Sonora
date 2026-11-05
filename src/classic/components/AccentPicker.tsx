import { fitArtPalette, useArtPalette } from '../../core/artPalette';
import { useStore, ACCENT_COLORS } from '../../core/store';

/** Shown on the album swatch until there's art to take colors from: every other accent, so it reads as "any". */
const ANY_COLOR = `conic-gradient(${ACCENT_COLORS.filter(a => a.id !== 'album').map(a => a.swatch).join(', ')}, ${ACCENT_COLORS[0].swatch})`;

type AccentPickerProps = {
  className?: string;
};

export function AccentPicker({ className = '' }: AccentPickerProps) {
  const accentColor = useStore(s => s.accentColor);
  const setAccentColor = useStore(s => s.setAccentColor);
  const theme = useStore(s => s.theme);
  const palette = useArtPalette(s => s.palette);
  const art = fitArtPalette(palette, theme);
  const albumSwatch = art ? `conic-gradient(${[...art.stops, art.stops[0]].join(', ')})` : ANY_COLOR;

  return (
    <div
      className={['accent-picker', className].filter(Boolean).join(' ')}
      role="radiogroup"
      aria-label="Accent color"
    >
      {ACCENT_COLORS.map(({ id, label, swatch }) => {
        const isSelected = accentColor === id;
        const title = id === 'album' ? 'Album art: colors from the playing track' : label;
        return (
          <button
            key={id}
            type="button"
            role="radio"
            aria-checked={isSelected}
            aria-label={title}
            title={title}
            className={['accent-swatch', isSelected ? 'is-selected' : ''].filter(Boolean).join(' ')}
            style={id === 'album'
              ? { ['--swatch' as string]: albumSwatch, ['--swatch-ring' as string]: art?.accent ?? 'var(--text-secondary)' }
              : { ['--swatch' as string]: swatch }}
            onClick={() => setAccentColor(id)}
          >
            <span className="accent-swatch-check" aria-hidden="true">
              <IconCheck />
            </span>
          </button>
        );
      })}
    </div>
  );
}

const IconCheck = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);
