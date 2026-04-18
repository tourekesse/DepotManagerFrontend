// Script de build optimisé pour mobile (CORRIGÉ)
// scripts/build-mobile.js

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const gzipSize = require('gzip-size');
const brotliSize = require('brotli-size');

// Configuration
// Note : Vite génère par défaut un dossier 'dist', pas 'build'
const BUILD_DIR = 'dist'; 
const REPORT_FILE = 'mobile-performance-report.json';

console.log('🚀 Starting mobile-optimized build...\n');

// 1. Nettoyer le build précédent
console.log('🧹 Cleaning previous build...');
if (fs.existsSync(BUILD_DIR)) {
  fs.rmSync(BUILD_DIR, { recursive: true, force: true });
}

// 2. Lancer le build RÉEL (Vite)
// On appelle 'npm run build' au lieu de 'npm run build:mobile' pour éviter la boucle infinie
console.log('📦 Building with Vite...');
try {
  execSync('npm run build', { stdio: 'inherit' });
} catch (error) {
  console.error('❌ Build failed:', error.message);
  process.exit(1);
}

// 3. Analyser les résultats
console.log('\n📊 Analyzing build results...');

const findFiles = (dir, extension) => {
  const files = [];
  if (!fs.existsSync(dir)) return files;

  function traverse(currentDir) {
    const items = fs.readdirSync(currentDir);
    for (const item of items) {
      const fullPath = path.join(currentDir, item);
      const stat = fs.statSync(fullPath);
      if (stat.isDirectory()) {
        traverse(fullPath);
      } else if (extension instanceof RegExp ? extension.test(fullPath) : fullPath.endsWith(extension)) {
        files.push({ path: fullPath, size: stat.size, name: item });
      }
    }
  }
  traverse(dir);
  return files;
};

const analyzeBuild = () => {
  const stats = {
    js: { files: 0, totalSize: 0, gzipped: 0, brotlified: 0 },
    css: { files: 0, totalSize: 0, gzipped: 0, brotlified: 0 },
    images: { files: 0, totalSize: 0, webpCount: 0 }
  };
  
  // Analyse JS
  const jsFiles = findFiles(BUILD_DIR, '.js');
  stats.js.files = jsFiles.length;
  jsFiles.forEach(file => {
    const content = fs.readFileSync(file.path);
    stats.js.totalSize += file.size;
    stats.js.gzipped += gzipSize.sync(content);
    stats.js.brotlified += brotliSize.sync(content);
  });
  
  // Analyse CSS
  const cssFiles = findFiles(BUILD_DIR, '.css');
  stats.css.files = cssFiles.length;
  cssFiles.forEach(file => {
    const content = fs.readFileSync(file.path);
    stats.css.totalSize += file.size;
    stats.css.gzipped += gzipSize.sync(content);
    stats.css.brotlified += brotliSize.sync(content);
  });

  // Analyse Images
  const imageFiles = findFiles(BUILD_DIR, /\.(png|jpg|jpeg|webp|gif|svg)$/);
  stats.images.files = imageFiles.length;
  stats.images.totalSize = imageFiles.reduce((sum, f) => sum + f.size, 0);
  stats.images.webpCount = imageFiles.filter(f => f.path.endsWith('.webp')).length;
  
  return stats;
};

const stats = analyzeBuild();

// Affichage des résultats
console.log('📈 Build Results:');
console.log('================');
console.log(`\n📄 JavaScript: ${stats.js.files} files, ${(stats.js.gzipped / 1024).toFixed(2)} KB (gzipped)`);
console.log(`🎨 CSS: ${stats.css.files} files, ${(stats.css.gzipped / 1024).toFixed(2)} KB (gzipped)`);
console.log(`🖼️ Images: ${stats.images.files} files, ${(stats.images.totalSize / 1024).toFixed(2)} KB total`);

// Sauvegarde du rapport
const totalSize = stats.js.totalSize + stats.css.totalSize;
const report = { timestamp: new Date().toISOString(), build: { totalSize, ...stats } };
fs.writeFileSync(REPORT_FILE, JSON.stringify(report, null, 2));

console.log(`\n📄 Detailed report saved to ${REPORT_FILE}`);
console.log('\n🎉 Mobile-optimized build completed successfully!');
