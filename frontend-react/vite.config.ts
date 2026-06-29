import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

const vendorChunk = (id: string) => {
  if (!id.includes('node_modules')) return undefined

  if (id.includes('react-dom') || id.includes('react-router-dom') || id.includes(`${path.sep}react${path.sep}`)) {
    return 'vendor-react'
  }

  // Keep React together with the entire antd ecosystem (antd, @ant-design, rc-*)
  // in a single chunk. Splitting them caused a circular-dependency init-order bug
  // where rc-* executed before React was defined -> "Cannot read properties of
  // undefined (reading 'version')" white screen.
  if (
    id.includes(`${path.sep}antd${path.sep}`) ||
    id.includes(`${path.sep}@ant-design${path.sep}`) ||
    id.includes(`${path.sep}rc-`) ||
    id.includes(`${path.sep}@rc-component${path.sep}`)
  ) {
    return 'vendor-react'
  }

  if (id.includes('emoji-picker-react')) {
    return 'vendor-emoji'
  }

  if (id.includes('pdfmake')) {
    return id.includes('vfs_fonts') ? 'vendor-pdf-fonts' : 'vendor-pdfmake'
  }

  if (id.includes(`${path.sep}xlsx${path.sep}`)) {
    return 'vendor-xlsx'
  }

  if (id.includes(`${path.sep}recharts${path.sep}`)) {
    return 'vendor-charts'
  }

  if (id.includes(`${path.sep}axios${path.sep}`)) {
    return 'vendor-axios'
  }

  if (id.includes(`${path.sep}dayjs${path.sep}`) || id.includes(`${path.sep}date-fns${path.sep}`)) {
    return 'vendor-date'
  }

  return 'vendor-misc'
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    chunkSizeWarningLimit: 1100,
    rollupOptions: {
      output: {
        manualChunks: vendorChunk,
      },
      onwarn(warning, warn) {
        // РРіРЅРѕСЂРёСЂСѓРµРј РїСЂРµРґСѓРїСЂРµР¶РґРµРЅРёСЏ
        if (warning.code === 'UNUSED_EXTERNAL_IMPORT') return;
        warn(warning);
      }
    }
  },
  server: {
    host: '0.0.0.0',
    port: 5173,
    watch: {
      usePolling: true,
      interval: 100
    },
    hmr: {
      host: 'localhost',
      port: 5173
    }
  }
})
