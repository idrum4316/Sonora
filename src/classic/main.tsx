import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './styles/index.css';
import { startAppearanceSync } from '../core/appearance';
import { startAudioSync } from '../core/audioSync';
import { App } from './App';

startAppearanceSync();
startAudioSync();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
