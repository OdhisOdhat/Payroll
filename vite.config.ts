import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  // 1. Plugins
  plugins: [react()],

  // 2. Base Path (Fixes the blank page/404 error)
  base: './', 

  // 3. Development Server & Proxy
  server: {
    port: 3000,
    proxy: {
      '/api': 'http://localhost:3001'
    }
  },

  // 4. Build Settings
  build: {
    // This matches the folder structure I saw in your screenshots
    outDir: 'dist/public',
    emptyOutDir: true, // Cleans the folder before building
  }
});