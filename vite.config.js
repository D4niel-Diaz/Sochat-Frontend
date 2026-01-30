import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const isProduction = mode === 'production';
  
  return {
    plugins: [
      react({
        // Exclude HMR in production
        ...(isProduction && {
          jsxRuntime: 'automatic',
        }),
      }),
    ],
    build: {
      // Disable source maps in production for smaller bundle
      sourcemap: false,
      // Optimize chunk splitting
      rollupOptions: {
        input: './index.html',
        output: {
          manualChunks: (id) => {
            // Separate vendor chunks
            if (id.includes('node_modules')) {
              if (id.includes('react') || id.includes('react-dom') || id.includes('react-router')) {
                return 'react-vendor';
              }
              if (id.includes('socket.io')) {
                return 'socket-vendor';
              }
              return 'vendor';
            }
          },
          // Ensure proper function names are preserved
          format: 'es',
          // Preserve function names to avoid minification issues
          generatedCode: {
            constBindings: false,
          },
        },
        // Exclude dev server and test files in production
        ...(isProduction && {
          external: (id) => {
            // Exclude any dev server related modules
            return id.includes('vite/client') || 
                   id.includes('@vitejs/plugin-react') ||
                   id.includes('reload.js') ||
                   id.includes('/@vite/');
          },
        }),
      },
      // Ensure dev server code is not included in production
      commonjsOptions: {
        include: [/node_modules/],
      },
      // Minify in production with better settings
      minify: isProduction ? 'esbuild' : false,
      // Target modern browsers for better optimization
      target: 'esnext',
      // Ensure proper module format
      modulePreload: false,
    },
    // Disable HMR in production builds
    define: {
      'import.meta.env.DEV': JSON.stringify(!isProduction),
      'import.meta.env.PROD': JSON.stringify(isProduction),
      'import.meta.hot': isProduction ? 'undefined' : undefined,
    },
    // Only enable dev server in development
    ...(isProduction ? {} : {
      server: {
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
      }
    }),
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
