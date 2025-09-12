import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  // Use relative base so the built `dist` can be deployed by uploading the folder
  // directly to any static host (GitHub Pages project sites, S3, FTP, etc.).
  base: './',
  plugins: [react()],
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
});
