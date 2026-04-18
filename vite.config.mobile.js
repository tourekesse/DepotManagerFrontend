// Vite configuration optimisée pour mobile
// vite.config.mobile.js

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import { visualizer } from 'rollup-plugin-visualizer';
import viteCompression from 'vite-plugin-compression';

export default defineConfig(({ mode }) => {
  const isProduction = mode === 'production';
  const isMobile = process.env.MOBILE === 'true';

  return {
    plugins: [
      react({
        // Optimisation React pour mobile
        jsxImportSource: '@emotion/react',
        babel: {
          plugins: [
            // Lazy loading des components
            '@babel/plugin-syntax-dynamic-import',
            // Optimisation mobile
            ...(isMobile ? [
              ['@babel/plugin-transform-react-jsx', {
                runtime: 'automatic',
                importSource: '@emotion/react'
              }]
            ] : [])
          ]
        }
      }),
      
      // Compression Gzip/Brotli
      ...(isProduction ? [
        viteCompression({
          algorithm: 'gzip',
          ext: '.gz'
        }),
        viteCompression({
          algorithm: 'brotliCompress',
          ext: '.br'
        })
      ] : []),
      
      // Analyse du bundle (optionnel)
      ...(process.env.ANALYZE ? [
        visualizer({
          filename: 'dist/stats.html',
          open: true,
          gzipSize: true,
          brotliSize: true
        })
      ] : [])
    ],

    resolve: {
      alias: {
        '@': resolve(__dirname, 'src'),
        '@components': resolve(__dirname, 'src/components'),
        '@hooks': resolve(__dirname, 'src/hooks'),
        '@utils': resolve(__dirname, 'src/utils'),
        '@assets': resolve(__dirname, 'src/assets')
      }
    },

    build: {
      // Optimisations mobile
      target: ['es2015', 'chrome80', 'firefox75', 'safari13'],
      minify: 'terser',
      sourcemap: isProduction ? 'hidden' : true,
      
      // Chunking optimisé
      rollupOptions: {
        output: {
          manualChunks: {
            // Vendors React
            vendor: ['react', 'react-dom'],
            
            // Material-UI
            mui: ['@mui/material', '@mui/icons-material'],
            
            // React Query
            query: ['@tanstack/react-query'],
            
            // Router
            router: ['react-router-dom']
          },
          
          // Noms de fichiers optimisés
          chunkFileNames: isProduction 
            ? 'static/js/[name]-[hash].js' 
            : 'static/js/[name].js',
          entryFileNames: isProduction 
            ? 'static/js/[name]-[hash].js' 
            : 'static/js/[name].js',
          assetFileNames: isProduction 
            ? 'static/assets/[name]-[hash].[ext]' 
            : 'static/assets/[name].[ext]'
        }
      },
      
      // Performance budgets
      chunkSizeWarningLimit: 100, // 100KB max par chunk
      assetsInlineLimit: 4096, // 4KB max inline
      
      // Terser options pour mobile
      terserOptions: {
        compress: {
          drop_console: isProduction,
          drop_debugger: isProduction,
          pure_funcs: isProduction ? ['console.log', 'console.info', 'console.debug'] : [],
          passes: 2
        },
        mangle: {
          safari10: true
        },
        format: {
          comments: false
        }
      }
    },

    // Optimisation des assets
    assetsInclude: ['**/*.webp'],
    
    // Configuration serveur de développement
    server: {
      port: 3000,
      host: true,
      // Headers pour le développement mobile
      headers: {
        'Cross-Origin-Embedder-Policy': 'unsafe-none',
        'Cross-Origin-Opener-Policy': 'unsafe-none',
        'Cross-Origin-Resource-Policy': 'cross-origin'
      }
    },

    // Configuration preview
    preview: {
      port: 4173,
      host: true
    },

    // Optimisation CSS
    css: {
      devSourcemap: !isProduction,
      preprocessorOptions: {
        scss: {
          includePaths: ['node_modules']
        }
      },
      // PostCSS plugins pour mobile
      postcss: {
        plugins: [
          require('autoprefixer')({
            grid: 'autoplace',
            overrideBrowserslist: [
              '> 1%',
              'last 2 versions',
              'not dead',
              'not ie 11'
            ]
          }),
          require('cssnano')({
            preset: ['default', {
              discardComments: { removeAll: true },
              normalizeWhitespace: true,
              minifySelectors: true,
              minifyGradients: true,
              minifyParams: true,
              convertValues: { length: false }
            }]
          })
        ]
      }
    },

    // Optimisation des dépendances
    optimizeDeps: {
      include: [
        'react',
        'react-dom',
        '@mui/material',
        '@mui/icons-material',
        'react-router-dom',
        '@tanstack/react-query'
      ],
      exclude: ['@mui/x-date-pickers']
    },

    // Configuration esbuild
    esbuild: {
      // Optimisations mobile
      drop: isProduction ? ['console', 'debugger'] : [],
      legalComments: 'none',
      minify: isProduction,
      treeShaking: true,
      platform: 'browser',
      target: ['es2015']
    },

    // Configuration worker
    worker: {
      format: 'es',
      rollupOptions: {
        output: {
          entryFileNames: 'static/js/[name]-[hash].js',
          chunkFileNames: 'static/js/[name]-[hash].js'
        }
      }
    }
  };
});
