// Script de vérification de la taille du bundle
// scripts/check-bundle-size.js

const fs = require('fs');
const path = require('path');
const { gzipSizeSync } = require('gzip-size');
const brotliSize = require('brotli-size');

// Configuration
const BUILD_DIR = 'build';
const BUNDLES_DIR = path.join(BUILD_DIR, 'static/js');
const MAX_BUNDLE_SIZE = 250 * 1024; // 250KB
const MAX_CHUNK_SIZE = 100 * 1024; // 100KB

console.log('📏 Checking bundle sizes...\n');

// Vérifier si le build existe
if (!fs.existsSync(BUILD_DIR)) {
  console.log('❌ Build directory not found. Run "npm run build" first.');
  process.exit(1);
}

// Analyser les fichiers JS
const analyzeBundles = () => {
  const bundles = [];
  
  if (!fs.existsSync(BUNDLES_DIR)) {
    console.log('❌ No JS bundles found');
    return bundles;
  }
  
  const files = fs.readdirSync(BUNDLES_DIR);
  
  for (const file of files) {
    if (file.endsWith('.js')) {
      const filePath = path.join(BUNDLES_DIR, file);
      const stat = fs.statSync(filePath);
      const content = fs.readFileSync(filePath);
      
      bundles.push({
        name: file,
        path: filePath,
        size: stat.size,
        gzipped: gzipSizeSync(content),
        brotli: brotliSize.sync(content)
      });
    }
  }
  
  return bundles.sort((a, b) => b.size - a.size);
};

// Analyser les assets
const analyzeAssets = () => {
  const assets = [];
  const staticDir = path.join(BUILD_DIR, 'static');
  
  function traverse(dir, relativePath = '') {
    if (!fs.existsSync(dir)) return;
    
    const items = fs.readdirSync(dir);
    
    items.forEach(item => {
      const itemPath = path.join(dir, item);
      const stat = fs.statSync(itemPath);
      
      if (stat.isDirectory()) {
        traverse(itemPath, path.join(relativePath, item));
      } else {
        assets.push({
          name: path.join(relativePath, item),
          path: itemPath,
          size: stat.size
        });
      }
    });
  }
  
  traverse(staticDir);
  return assets;
};

// Calculer les statistiques
const calculateStats = (bundles, assets) => {
  const totalBundleSize = bundles.reduce((sum, b) => sum + b.size, 0);
  const totalGzipped = bundles.reduce((sum, b) => sum + b.gzipped, 0);
  const totalBrotli = bundles.reduce((sum, b) => sum + b.brotli, 0);
  const totalAssetSize = assets.reduce((sum, a) => sum + a.size, 0);
  
  return {
    bundles: {
      count: bundles.length,
      totalSize: totalBundleSize,
      totalGzipped,
      totalBrotli,
      compressionRatio: ((1 - totalGzipped / totalBundleSize) * 100).toFixed(1)
    },
    assets: {
      count: assets.length,
      totalSize: totalAssetSize
    },
    overall: {
      totalSize: totalBundleSize + totalAssetSize,
      totalGzipped: totalGzipped + totalAssetSize,
      totalBrotli: totalBrotli + totalAssetSize
    }
  };
};

// Afficher les résultats
const displayResults = (bundles, assets, stats) => {
  console.log('📊 Bundle Analysis:');
  console.log('==================');
  
  console.log(`\n📦 JavaScript Bundles (${stats.bundles.count} files):`);
  console.log(`  Original size: ${(stats.bundles.totalSize / 1024).toFixed(2)} KB`);
  console.log(`  Gzipped: ${(stats.bundles.totalGzipped / 1024).toFixed(2)} KB (${stats.bundles.compressionRatio}% compression)`);
  console.log(`  Brotli: ${(stats.bundles.totalBrotli / 1024).toFixed(2)} KB`);
  
  console.log(`\n🖼️ Assets (${stats.assets.count} files):`);
  console.log(`  Total size: ${(stats.assets.totalSize / 1024).toFixed(2)} KB`);
  
  console.log(`\n📈 Overall:`);
  console.log(`  Total size: ${(stats.overall.totalSize / 1024).toFixed(2)} KB`);
  console.log(`  Gzipped total: ${(stats.overall.totalGzipped / 1024).toFixed(2)} KB`);
  console.log(`  Brotli total: ${(stats.overall.totalBrotli / 1024).toFixed(2)} KB`);
  
  // Afficher les plus gros bundles
  console.log(`\n🔍 Largest bundles:`);
  bundles.slice(0, 5).forEach((bundle, index) => {
    const icon = bundle.size > MAX_CHUNK_SIZE ? '⚠️' : '✅';
    console.log(`  ${index + 1}. ${icon} ${bundle.name}`);
    console.log(`     ${(bundle.size / 1024).toFixed(2)} KB | ${(bundle.gzipped / 1024).toFixed(2)} KB gzipped | ${(bundle.brotli / 1024).toFixed(2)} KB brotli`);
  });
  
  // Performance checks
  console.log(`\n⚡ Performance Checks:`);
  console.log('====================');
  
  let warnings = 0;
  
  if (stats.bundles.totalSize > MAX_BUNDLE_SIZE) {
    console.log(`⚠️  Total bundle size exceeds ${MAX_BUNDLE_SIZE / 1024}KB limit`);
    warnings++;
  } else {
    console.log('✅ Total bundle size within limits');
  }
  
  const largeChunks = bundles.filter(b => b.size > MAX_CHUNK_SIZE);
  if (largeChunks.length > 0) {
    console.log(`⚠️  ${largeChunks.length} chunks exceed ${MAX_CHUNK_SIZE / 1024}KB limit`);
    largeChunks.forEach(chunk => {
      console.log(`    - ${chunk.name}: ${(chunk.size / 1024).toFixed(2)} KB`);
    });
    warnings++;
  } else {
    console.log('✅ All chunks within size limits');
  }
  
  if (stats.bundles.compressionRatio < 60) {
    console.log(`⚠️  Low compression ratio (${stats.bundles.compressionRatio}%)`);
    warnings++;
  } else {
    console.log(`✅ Good compression ratio (${stats.bundles.compressionRatio}%)`);
  }
  
  if (warnings === 0) {
    console.log('\n🎉 All performance checks passed!');
  } else {
    console.log(`\n⚠️  ${warnings} performance warnings detected`);
  }
  
  return warnings;
};

// Générer des recommandations
const generateRecommendations = (bundles, assets, stats) => {
  const recommendations = [];
  
  if (stats.bundles.totalSize > MAX_BUNDLE_SIZE) {
    recommendations.push('Consider code splitting to reduce main bundle size');
  }
  
  const largeChunks = bundles.filter(b => b.size > MAX_CHUNK_SIZE);
  if (largeChunks.length > 0) {
    recommendations.push('Split large chunks into smaller modules');
  }
  
  if (stats.bundles.compressionRatio < 60) {
    recommendations.push('Enable better compression (Brotli, gzip level 9)');
  }
  
  const largeAssets = assets.filter(a => a.size > 500 * 1024); // > 500KB
  if (largeAssets.length > 0) {
    recommendations.push('Optimize large assets (images, fonts)');
  }
  
  if (bundles.length > 10) {
    recommendations.push('Consider reducing number of chunks');
  }
  
  return recommendations;
};

// Main function
const checkBundleSize = () => {
  console.log('🔍 Analyzing build...');
  
  const bundles = analyzeBundles();
  const assets = analyzeAssets();
  const stats = calculateStats(bundles, assets);
  
  const warnings = displayResults(bundles, assets, stats);
  
  const recommendations = generateRecommendations(bundles, assets, stats);
  
  if (recommendations.length > 0) {
    console.log('\n💡 Recommendations:');
    recommendations.forEach((rec, index) => {
      console.log(`  ${index + 1}. ${rec}`);
    });
  } else {
    console.log('\n✅ No recommendations - bundle is well optimized!');
  }
  
  // Générer le rapport
  const report = {
    timestamp: new Date().toISOString(),
    stats,
    bundles,
    assets,
    recommendations,
    warnings
  };
  
  fs.writeFileSync('bundle-size-report.json', JSON.stringify(report, null, 2));
  console.log(`\n📄 Detailed report saved to bundle-size-report.json`);
  
  // Exit code basé sur les warnings
  process.exit(warnings > 0 ? 1 : 0);
};

// Exécuter la vérification
checkBundleSize();
