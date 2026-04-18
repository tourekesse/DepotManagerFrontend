// Configuration Webpack pour optimisation mobile
// webpack.mobile.config.js

const path = require('path');
const TerserPlugin = require('terser-webpack-plugin');
const CompressionPlugin = require('compression-webpack-plugin');
const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin;

module.exports = (env, argv) => {
  const isProduction = argv.mode === 'production';
  const isMobile = env && env.mobile === true;

  return {
    mode: isProduction ? 'production' : 'development',
    devtool: isProduction ? 'source-map' : 'eval-source-map',
    
    entry: {
      main: './src/index.js',
      // Chunk séparé pour les vendors
      vendor: ['react', 'react-dom', '@mui/material', '@mui/icons-material']
    },
    
    output: {
      path: path.resolve(__dirname, 'build'),
      filename: isProduction ? 'static/js/[name].[contenthash:8].js' : 'static/js/[name].js',
      chunkFilename: isProduction ? 'static/js/[name].[contenthash:8].chunk.js' : 'static/js/[name].chunk.js',
      publicPath: '/',
      clean: true
    },
    
    optimization: {
      minimize: isProduction,
      minimizer: [
        new TerserPlugin({
          terserOptions: {
            compress: {
              drop_console: isProduction,
              drop_debugger: isProduction,
              pure_funcs: isProduction ? ['console.log', 'console.info'] : []
            },
            mangle: {
              safari10: true
            },
            format: {
              comments: false
            }
          },
          extractComments: false
        })
      ],
      
      // Splitting optimisé pour mobile
      splitChunks: {
        chunks: 'all',
        cacheGroups: {
          // Vendors React et Material-UI
          vendor: {
            test: /[\\/]node_modules[\\/](react|react-dom|@mui)[\\/]/,
            name: 'vendor',
            chunks: 'all',
            priority: 20
          },
          
          // Autres vendors
          common: {
            test: /[\\/]node_modules[\\/]/,
            name: 'common',
            chunks: 'all',
            priority: 10,
            minChunks: 2
          },
          
          // Code de l'application
          default: {
            minChunks: 2,
            priority: 5,
            reuseExistingChunk: true
          }
        }
      },
      
      // Runtime séparé pour le caching
      runtimeChunk: {
        name: 'runtime'
      }
    },
    
    resolve: {
      extensions: ['.js', '.jsx', '.ts', '.tsx'],
      alias: {
        // Alias pour optimiser les imports
        '@': path.resolve(__dirname, 'src'),
        '@components': path.resolve(__dirname, 'src/components'),
        '@hooks': path.resolve(__dirname, 'src/hooks'),
        '@utils': path.resolve(__dirname, 'src/utils')
      }
    },
    
    module: {
      rules: [
        {
          test: /\.(js|jsx|ts|tsx)$/,
          exclude: /node_modules/,
          use: {
            loader: 'babel-loader',
            options: {
              presets: [
                ['@babel/preset-env', {
                  useBuiltIns: 'usage',
                  corejs: 3,
                  targets: {
                    // Cibles mobiles optimisées
                    chrome: '>=80',
                    safari: '>=13',
                    firefox: '>=75',
                    edge: '>=80'
                  }
                }],
                '@babel/preset-react'
              ],
              plugins: [
                // Lazy loading des components
                '@babel/plugin-syntax-dynamic-import',
                // Tree shaking
                '@babel/plugin-transform-runtime',
                // Optimisation mobile
                ...(isMobile ? [
                  ['@babel/plugin-transform-react-jsx', {
                        runtime: 'automatic',
                        importSource: '@emotion/react'
                      }]
                ] : [])
              ],
              cacheDirectory: true
            }
          }
        },
        
        // Optimisation des images
        {
          test: /\.(jpe?g|png|gif|webp)$/i,
          type: 'asset/resource',
          generator: {
            filename: 'static/images/[name].[contenthash:8][ext]'
          },
          use: [
            {
              loader: 'image-webpack-loader',
              options: {
                mozjpeg: {
                  progressive: true,
                  quality: 80
                },
                optipng: {
                  enabled: false
                },
                pngquant: {
                  quality: [0.65, 0.8],
                  speed: 4
                },
                gifsicle: {
                  interlaced: false
                },
                webp: {
                  quality: 75,
                  method: 6
                }
              }
            }
          ]
        },
        
        // Optimisation CSS
        {
          test: /\.css$/i,
          use: [
            'style-loader',
            {
              loader: 'css-loader',
              options: {
                importLoaders: 1,
                modules: {
                  localIdentName: isProduction 
                    ? '[hash:base64:5]' 
                    : '[name]__[local]___[hash:base64:5]'
                }
              }
            },
            {
              loader: 'postcss-loader',
              options: {
                plugins: [
                  require('autoprefixer'),
                  require('cssnano')({
                    preset: ['default', {
                      discardComments: { removeAll: true },
                      normalizeWhitespace: true,
                      minifySelectors: true
                    }]
                  })
                ]
              }
            }
          ]
        },
        
        // Compression Gzip/Brotli
        {
          test: /\.(js|css|html|svg)$/,
          enforce: 'pre',
          use: [{
            loader: 'compression-webpack-loader',
            options: {
              algorithm: 'gzip',
              test: /\.(js|css|html|svg)$/,
              threshold: 10240,
              minRatio: 0.8
            }
          }]
        }
      ]
    },
    
    plugins: [
      // Compression des assets
      ...(isProduction ? [
        new CompressionPlugin({
          algorithm: 'gzip',
          test: /\.(js|css|html|svg)$/,
          threshold: 10240,
          minRatio: 0.8,
          deleteOriginalAssets: false
        }),
        
        new CompressionPlugin({
          filename: '[path][base].br',
          algorithm: 'brotliCompress',
          test: /\.(js|css|html|svg)$/,
          threshold: 10240,
          minRatio: 0.8,
          deleteOriginalAssets: false
        })
      ] : []),
      
      // Analyse du bundle (optionnel)
      ...(env && env.analyze ? [
        new BundleAnalyzerPlugin({
          analyzerMode: 'static',
          openAnalyzer: false,
          reportFilename: 'bundle-report.html'
        })
      ] : [])
    ],
    
    // Performance budgets pour mobile
    performance: {
      hints: isProduction ? 'warning' : false,
      maxEntrypointSize: 250 * 1024, // 250KB max par entry point
      maxAssetSize: 100 * 1024, // 100KB max par asset
      assetFilter: (assetFilename) => {
        return !assetFilename.endsWith('.map');
      }
    },
    
    // Externals pour réduire la taille (optionnel)
    externals: isProduction ? {
      // React et ReactDOM peuvent être chargés depuis CDN
      react: 'React',
      'react-dom': 'ReactDOM'
    } : {},
    
    stats: {
      colors: true,
      modules: false,
      children: false,
      chunks: false,
      chunkModules: false
    }
  };
};
