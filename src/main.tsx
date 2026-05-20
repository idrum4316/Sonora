import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './styles/index.css';
import { App } from './App';

try {
  const stored = localStorage.getItem('sonora-store');
  const state = stored ? JSON.parse(stored)?.state : null;
  const theme = state?.theme;
  const accent = state?.accentColor;
  if (theme === 'dark' || theme === 'light') {
    document.documentElement.dataset.theme = theme;
  }
  if (typeof accent === 'string' && accent.length) {
    document.documentElement.dataset.accent = accent;
  }
} catch {
  // If storage is unavailable or corrupted, fall back to the default dark theme.
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
