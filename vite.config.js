import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const isProduction = mode === 'production';
  
  return {
    plugins: [react()],
    build: {
      // Disable source maps in production for smaller bundle
      sourcemap: false,
      // Optimize chunk splitting
      rollupOptions: {
        output: {
          manualChunks: {
            'react-vendor': ['react', 'react-dom', 'react-router-dom'],
            'socket-vendor': ['socket.io-client'],
          },
        },
      },
      // Ensure dev server code is not included in production
      commonjsOptions: {
        include: [/node_modules/],
      },
      // Minify in production
      minify: isProduction ? 'esbuild' : false,
    },
    // Disable HMR in production builds
    define: {
      'import.meta.env.DEV': JSON.stringify(!isProduction),
      'import.meta.env.PROD': JSON.stringify(isProduction),
    },
    // Only enable dev server in development
    server: isProduction ? undefined : {
      port: 5173,
      strictPort: false,
      hmr: {
        port: 5173,
      },
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
    },
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
  };
});
