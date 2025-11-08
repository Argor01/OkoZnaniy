import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    strictPort: true,
    hmr: {
      host: 'localhost',
    },
    watch: {
      usePolling: true,
    },
  },
  optimizeDeps: {
    include: ['recharts'],
    force: true, // Принудительная пересборка зависимостей
  },
  build: {
    commonjsOptions: {
      include: [/recharts/, /node_modules/],
    },
  },
})
