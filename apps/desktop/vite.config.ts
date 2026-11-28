import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// Tauri v2 expects a fixed dev server and keeps its own terminal output visible.
export default defineConfig({
  plugins: [react()],
  clearScreen: false,
  server: {
    host: '127.0.0.1',
    port: 1420,
    strictPort: true,
  },
  envPrefix: ['VITE_', 'TAURI_ENV_'],
  resolve: {
    // The scene package and the app must share one React and one three.js instance.
    dedupe: ['react', 'react-dom', 'three'],
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    target: 'safari16',
    // GLB files must stay real files: the desktop CSP refuses `data:` fetches.
    assetsInlineLimit: 0,
    // three.js lives in its own lazily loaded chunk and is read from local disk.
    chunkSizeWarningLimit: 1200,
  },
});
