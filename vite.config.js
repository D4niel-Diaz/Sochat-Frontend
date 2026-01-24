import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/tests/setup.js'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'src/tests/',
      ],
    },
  },
  server: {
    port: 5173,
    strictPort: false,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
        secure: false,
        configure: (proxy, options) => {
          proxy.on('proxyReq', (proxyReq, req, res) => {
            console.log('🔄 Proxying request:', req.method, req.url, 'to', options.target);
          });
          proxy.on('proxyRes', (proxyRes, req, res) => {
            console.log('✅ Proxy response:', proxyRes.statusCode, req.url);
          });
          proxy.on('error', (err, req, res) => {
            console.error('❌ Proxy error:', err.message, req.url);
          });
        }
      }
    }
  }
})
