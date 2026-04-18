// Script d'analyse rapide du build mobile
// scripts/analyze-build.js

const fs = require('fs');
const path = require('path');

console.log('📊 Mobile Build Analysis\n');

const BUILD_DIR = 'build';

if (!fs.existsSync(BUILD_DIR)) {
  console.log('❌ Build directory not found');
  process.exit(1);
}

// Analyser les fichiers JS
const jsFiles = [];
const cssFiles = [];
const imageFiles = [];

function analyzeDirectory(dir) {
  const items = fs.readdirSync(dir);
  
  items.forEach(item => {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);
    
    if (stat.isDirectory()) {
      analyzeDirectory(fullPath);
    } else {
      const ext = path.extname(item).toLowerCase();
      const size = stat.size;
      
      if (ext === '.js') {
        jsFiles.push({ name: item, path: fullPath, size });
      } else if (ext === '.css') {
        cssFiles.push({ name: item, path: fullPath, size });
      } else if (['.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp'].includes(ext)) {
        imageFiles.push({ name: item, path: fullPath, size });
      }
    }
  });
}

analyzeDirectory(BUILD_DIR);

// Calculer les totaux
const totalJsSize = jsFiles.reduce((sum, file) => sum + file.size, 0);
const totalCssSize = cssFiles.reduce((sum, file) => sum + file.size, 0);
const totalImageSize = imageFiles.reduce((sum, file) => sum + file.size, 0);

// Afficher les résultats
console.log('📦 JavaScript Files:');
console.log(`  Count: ${jsFiles.length}`);
console.log(`  Total: ${(totalJsSize / 1024).toFixed(2)} KB`);

console.log('\n🎨 CSS Files:');
console.log(`  Count: ${cssFiles.length}`);
console.log(`  Total: ${(totalCssSize / 1024).toFixed(2)} KB`);

console.log('\n🖼️ Image Files:');
console.log(`  Count: ${imageFiles.length}`);
console.log(`  Total: ${(totalImageSize / 1024).toFixed(2)} KB`);

console.log('\n🔍 Largest JavaScript Files:');
jsFiles
  .sort((a, b) => b.size - a.size)
  .slice(0, 5)
  .forEach((file, index) => {
    console.log(`  ${index + 1}. ${file.name}: ${(file.size / 1024).toFixed(2)} KB`);
  });

// Performance checks
console.log('\n⚡ Performance Checks:');
const mainBundle = jsFiles.find(f => f.name.includes('index-'));
if (mainBundle) {
  const mainSizeKB = mainBundle.size / 1024;
  if (mainSizeKB > 250) {
    console.log(`⚠️  Main bundle too large: ${mainSizeKB.toFixed(2)} KB (should be < 250KB)`);
  } else {
    console.log(`✅ Main bundle size OK: ${mainSizeKB.toFixed(2)} KB`);
  }
}

const muiBundle = jsFiles.find(f => f.name.includes('mui-'));
if (muiBundle) {
  const muiSizeKB = muiBundle.size / 1024;
  if (muiSizeKB > 100) {
    console.log(`⚠️  MUI bundle too large: ${muiSizeKB.toFixed(2)} KB (should be < 100KB)`);
  } else {
    console.log(`✅ MUI bundle size OK: ${muiSizeKB.toFixed(2)} KB`);
  }
}

console.log('\n💡 Recommendations:');
if (mainBundle && mainBundle.size > 250 * 1024) {
  console.log('  • Consider code splitting for the main bundle');
}
if (muiBundle && muiBundle.size > 100 * 1024) {
  console.log('  • Consider tree-shaking unused MUI components');
}
if (imageFiles.length > 50) {
  console.log('  • Consider optimizing images (WebP conversion)');
}

console.log('\n🎉 Analysis completed!');
