import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'
import autoprefixer from 'autoprefixer'
import { visualizer } from 'rollup-plugin-visualizer'
import viteCompression from 'vite-plugin-compression'

const DEFAULT_BACKEND = 'http://localhost:8080'

async function getBackendUrl() {
  try {
    const res = await fetch('http://localhost:8080/api/endpoints/backend')
    if (res.ok) {
      const data = await res.json()
      const port = data.port ? `:${data.port}` : ''
      return `${data.url}${port}`
    }
  } catch (e) {
    console.log('Using default backend URL')
  }
  return DEFAULT_BACKEND
}

export default defineConfig(async ({ mode }) => {
  const isProduction = mode === 'production'
  const isMobile = process.env.MOBILE === 'true'

  const backendUrl = await getBackendUrl()
  console.log(`🔗 Proxy target: ${backendUrl}`)

  return {
    base: '/',
    plugins: [
      react(),
      
      ...(isProduction ? [
        viteCompression({ algorithm: 'gzip', ext: '.gz' }),
        viteCompression({ algorithm: 'brotliCompress', ext: '.br' })
      ] : []),
      
      ...(process.env.ANALYZE ? [
        visualizer({
          filename: 'dist/stats.html',
          open: true,
          gzipSize: true,
          brotliSize: true
        })
      ] : [])
    ],
    
    build: {
      outDir: 'build',
      target: ['es2015', 'chrome80', 'firefox75', 'safari13'],
      minify: 'terser',
      sourcemap: isProduction ? 'hidden' : true,
      
      rollupOptions: {
        output: {
          manualChunks: {
            vendor: ['react', 'react-dom'],
            mui: ['@mui/material', '@mui/icons-material'],
            router: ['react-router-dom']
          },
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
      
      chunkSizeWarningLimit: 100,
      assetsInlineLimit: 4096,
      
      terserOptions: {
        compress: {
          drop_console: isProduction,
          drop_debugger: isProduction,
          pure_funcs: isProduction ? ['console.log', 'console.info', 'console.debug'] : [],
          passes: 2
        },
        mangle: { safari10: true },
        format: { comments: false }
      }
    },
    
    css: {
      postcss: {
        plugins: [
          autoprefixer({
            grid: 'autoplace',
            overrideBrowserslist: ['> 1%', 'last 2 versions', 'not dead', 'not ie 11']
          }),
          ...(isProduction ? [
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
          ] : [])
        ],
      },
    },
    
    esbuild: {
      loader: 'tsx',
      include: /src\/.*\.(js|jsx|ts|tsx)$/,
      exclude: [],
      drop: isProduction ? ['console', 'debugger'] : [],
      legalComments: 'none',
      treeShaking: true,
      platform: 'browser',
      target: ['es2015']
    },
    
    optimizeDeps: {
      force: true,
      esbuildOptions: {
        loader: { '.js': 'jsx' },
      },
      include: [
        'react', 'react-dom', 'react-is', 'hoist-non-react-statics',
        '@mui/material', '@mui/icons-material', 'react-router-dom'
      ],
      exclude: ['@mui/x-date-pickers']
    },
    
    resolve: {
      alias: {
        'react-is': path.resolve(__dirname, 'node_modules/react-is'),
        'hoist-non-react-statics': path.resolve(__dirname, 'node_modules/hoist-non-react-statics/dist/hoist-non-react-statics.cjs.js'),
        '@': path.resolve(__dirname, 'src'),
        '@components': path.resolve(__dirname, 'src/components'),
        '@hooks': path.resolve(__dirname, 'src/hooks'),
        '@utils': path.resolve(__dirname, 'src/utils'),
        '@assets': path.resolve(__dirname, 'src/assets')
      }
    },
    
    server: {
      host: true,
      port: 5174,
      allowedHosts: ['shandra-electronegative-ladylike.ngrok-free.dev', 'depotmanager.gm-soft.ca'],
      proxy: {
        '/api': {
          target: backendUrl,
          changeOrigin: true,
          secure: false,
        },
      },
      historyApiFallback: true,
    },
    
    preview: {
      port: 4173,
      historyApiFallback: true,
    },
  }
})
