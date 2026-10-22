import path from 'node:path'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vitest/config'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  // Bun's symlinked store can expose React under two paths, which breaks hooks in better-auth/react
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
    dedupe: ['react', 'react-dom'],
  },
  optimizeDeps: {
    include: ['better-auth/react'],
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
  },
  server: {
    // The API only trusts CLIENT_URL (http://localhost:5173): on another port sign-out is rejected with 403
    strictPort: true,
    proxy: {
      '/api': process.env.API_URL ?? 'http://localhost:3000',
    },
  },
})
