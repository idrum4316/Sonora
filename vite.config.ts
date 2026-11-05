import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      // Each UI is its own page, so its CSS and fonts never reach the other.
      input: {
        main: 'index.html',
        terminal: 'terminal/index.html',
      },
    },
  },
});
