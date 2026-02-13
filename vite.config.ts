// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tsconfigPaths from 'vite-tsconfig-paths';
import { resolve } from 'path';

export default defineConfig({
  // 1. Plugins
  plugins: [
    react(),
    tsconfigPaths(), // enables @/* aliases from tsconfig.json
  ],

  // 2. Environment variable handling
  // Prevents "process is not defined" in some older libraries
  define: {
    'process.env': {},
  },

  // 3. Base path (good default for most hosting platforms)
  base: '/',

  // 4. Dev server + CORS/proxy fix (most important for your current errors)
  server: {
    port: 3000,
    strictPort: true,                // fail if port 3000 is taken
    host: 'localhost',               // explicit – helps HMR stability
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:4000',   // ← Changed to 127.0.0.1 (IPv4) to fix ERR_CONNECTION_REFUSED
        changeOrigin: true,
        secure: false,
        // Uncomment ONLY if backend routes do NOT start with /api
        // rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
    // Helps fix "server connection lost" / HMR websocket issues
    hmr: {
      host: 'localhost',
      protocol: 'ws',
    },
  },

  // 5. Build configuration
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: resolve(__dirname, 'index.html'),
    },
  },
});