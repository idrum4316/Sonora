import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './styles/globals.css';
import { App } from './App';

try {
  const stored = localStorage.getItem('sonora-store');
  const theme = stored ? JSON.parse(stored)?.state?.theme : null;
  if (theme === 'dark' || theme === 'light') {
    document.documentElement.dataset.theme = theme;
  }
} catch {
  // If storage is unavailable or corrupted, fall back to the default dark theme.
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
