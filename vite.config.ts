// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  // 1. Plugins
  plugins: [react()],

  // 2. Base Path
  // '/' is recommended for Vercel and most production environments
  // Use './' only if you are deploying to a subfolder without proper rewrites
  base: '/',

  // 3. Development Server & Proxy ← Added/updated here
  server: {
    port: 3000,                  // Frontend runs on http://localhost:3000
    proxy: {
      '/api': {
        target: 'http://localhost:3001',   // Your backend port (change if server.ts uses a different port)
        changeOrigin: true,
        secure: false,                     // false in dev (no HTTPS)
        // Optional: remove /api prefix if your backend routes don't start with /api
        // rewrite: (path) => path.replace(/^\/api/, '')
      }
    }
  },

  // 4. Build Settings
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: resolve(__dirname, 'index.html')
    }
  }
});