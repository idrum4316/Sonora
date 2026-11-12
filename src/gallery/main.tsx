import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './gallery.css';
import { startAudioSync } from '../core/audioSync';
import { startAudioTap } from '../core/audioTap';
import { App } from './App';
import { startThemeSync } from './theme';

// The gallery follows the shared dark or light theme, but takes its color from the art, so it skips
// the accent sync the other UIs use.
startThemeSync();
startAudioSync();
startAudioTap();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
