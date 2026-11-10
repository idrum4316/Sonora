import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './gallery.css';
import { startAudioSync } from '../core/audioSync';
import { startAudioTap } from '../core/audioTap';
import { App } from './App';

// The gallery has its own look, always dark, with color taken from the art, so it skips the
// theme and accent sync the other UIs use.
startAudioSync();
startAudioTap();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
