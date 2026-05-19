import { useStore } from '../store/useStore';

type ThemeToggleProps = {
  className?: string;
  showLabel?: boolean;
};

export function ThemeToggle({ className = '', showLabel = false }: ThemeToggleProps) {
  const theme = useStore(s => s.theme);
  const toggleTheme = useStore(s => s.toggleTheme);
  const isDark = theme === 'dark';
  const nextThemeLabel = isDark ? 'light' : 'dark';

  return (
    <button
      type="button"
      className={["theme-toggle", className].filter(Boolean).join(' ')}
      aria-label={`Switch to ${nextThemeLabel} mode`}
      aria-pressed={!isDark}
      title={`Switch to ${nextThemeLabel} mode`}
      onClick={toggleTheme}
    >
      <span className="theme-toggle-track" aria-hidden="true">
        <span className="theme-toggle-thumb">
          {isDark ? <IconMoon /> : <IconSun />}
        </span>
      </span>
      {showLabel && (
        <span className="theme-toggle-label">{isDark ? 'Dark' : 'Light'} mode</span>
      )}
    </button>
  );
}

const IconSun = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2" />
    <path d="M12 20v2" />
    <path d="m4.93 4.93 1.41 1.41" />
    <path d="m17.66 17.66 1.41 1.41" />
    <path d="M2 12h2" />
    <path d="M20 12h2" />
    <path d="m6.34 17.66-1.41 1.41" />
    <path d="m19.07 4.93-1.41 1.41" />
  </svg>
);

const IconMoon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M21 12.8A8.6 8.6 0 1 1 11.2 3 6.7 6.7 0 0 0 21 12.8z" />
  </svg>
);
