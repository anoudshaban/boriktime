import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'node:url'
import { defineConfig, loadEnv } from 'vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const backend = env.VITE_BACKEND_URL || 'http://127.0.0.1:8000'

  return {
    plugins: [react()],
    // Production files are served by Laravel from backend/public/app.
    base: mode === 'production' ? '/app/' : '/',
    build: {
      outDir: fileURLToPath(new URL('../backend/public/app', import.meta.url)),
      emptyOutDir: true,
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('node_modules/motion') || id.includes('node_modules/framer-motion')) return 'motion'
            if (id.includes('node_modules/react')) return 'react'
          },
        },
      },
    },
    server: {
      port: 5173,
      proxy: {
        '/api': backend,
        '/storage': backend,
      },
    },
  }
})
