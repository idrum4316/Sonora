import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '../core/tokens.css';
import './terminal.css';
import { startAppearanceSync } from '../core/appearance';
import { startAudioSync } from '../core/audioSync';
import { App } from './App';
import { startAudioTap } from '../core/audioTap';

startAppearanceSync();
startAudioSync();
startAudioTap();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
