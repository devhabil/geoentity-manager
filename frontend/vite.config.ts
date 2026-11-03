import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

// In dev, /api and /healthz are proxied to the Go backend, so no CORS setup is needed.
const backend = process.env.VITE_DEV_PROXY_TARGET ?? 'http://localhost:8080'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': backend,
      '/healthz': backend,
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test-setup.ts'],
    globals: true,
  },
})
