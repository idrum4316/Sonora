import { useStore, ACCENT_COLORS } from '../../core/store';

type AccentPickerProps = {
  className?: string;
};

export function AccentPicker({ className = '' }: AccentPickerProps) {
  const accentColor = useStore(s => s.accentColor);
  const setAccentColor = useStore(s => s.setAccentColor);

  return (
    <div
      className={['accent-picker', className].filter(Boolean).join(' ')}
      role="radiogroup"
      aria-label="Accent color"
    >
      {ACCENT_COLORS.map(({ id, label, swatch }) => {
        const isSelected = accentColor === id;
        return (
          <button
            key={id}
            type="button"
            role="radio"
            aria-checked={isSelected}
            aria-label={label}
            title={label}
            className={['accent-swatch', isSelected ? 'is-selected' : ''].filter(Boolean).join(' ')}
            style={{ ['--swatch' as string]: swatch }}
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
