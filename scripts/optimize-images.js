// Script d'optimisation des images pour mobile
// scripts/optimize-images.js

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Configuration
const IMAGES_DIR = 'public/images';
const UPLOADS_DIR = 'public/uploads';
const WEBP_QUALITY = 75;
const SUPPORTED_FORMATS = ['.jpg', '.jpeg', '.png', '.gif'];

console.log('🖼️ Starting image optimization for mobile...\n');

// Vérifier si les répertoires existent
const checkDirectories = () => {
  const dirs = [IMAGES_DIR, UPLOADS_DIR];
  const existingDirs = dirs.filter(dir => fs.existsSync(dir));
  
  if (existingDirs.length === 0) {
    console.log('❌ No image directories found');
    return false;
  }
  
  console.log(`📁 Found ${existingDirs.length} image directories:`);
  existingDirs.forEach(dir => console.log(`  - ${dir}`));
  return existingDirs;
};

// Trouver toutes les images à optimiser
const findImages = (directories) => {
  const images = [];
  
  directories.forEach(dir => {
    function traverse(currentDir) {
      const items = fs.readdirSync(currentDir);
      
      for (const item of items) {
        const fullPath = path.join(currentDir, item);
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory()) {
          traverse(fullPath);
        } else {
          const ext = path.extname(item).toLowerCase();
          if (SUPPORTED_FORMATS.includes(ext)) {
            images.push({
              path: fullPath,
              name: item,
              ext: ext,
              size: stat.size
            });
          }
        }
      }
    }
    
    traverse(dir);
  });
  
  return images;
};

// Vérifier si cwebp est disponible
const checkWebPTools = () => {
  try {
    execSync('cwebp -version', { stdio: 'ignore' });
    console.log('✅ WebP tools available');
    return true;
  } catch (error) {
    console.log('❌ WebP tools not found. Please install webp package:');
    console.log('  Ubuntu/Debian: sudo apt-get install webp');
    console.log('  macOS: brew install webp');
    console.log('  Windows: Download from https://developers.google.com/speed/webp');
    return false;
  }
};

// Convertir une image en WebP
const convertToWebP = (image) => {
  const webpPath = image.path.replace(image.ext, '.webp');
  
  // Vérifier si le WebP existe déjà et est plus récent
  if (fs.existsSync(webpPath)) {
    const webpStat = fs.statSync(webpPath);
    const originalStat = fs.statSync(image.path);
    
    if (webpStat.mtime > originalStat.mtime) {
      console.log(`⏭️  Skipping ${image.name} (WebP already exists and is newer)`);
      return { success: true, skipped: true, webpPath };
    }
  }
  
  try {
    const command = `cwebp -q ${WEBP_QUALITY} "${image.path}" -o "${webpPath}"`;
    execSync(command, { stdio: 'ignore' });
    
    const webpSize = fs.statSync(webpPath).size;
    const savings = ((image.size - webpSize) / image.size * 100).toFixed(1);
    
    console.log(`✅ ${image.name} -> WebP (${image.size}B -> ${webpSize}B, ${savings}% saved)`);
    
    return { 
      success: true, 
      savings: parseFloat(savings), 
      originalSize: image.size, 
      webpSize, 
      webpPath 
    };
  } catch (error) {
    console.log(`❌ Failed to convert ${image.name}: ${error.message}`);
    return { success: false, error: error.message };
  }
};

// Analyser les résultats
const analyzeResults = (results) => {
  const successful = results.filter(r => r.success && !r.skipped);
  const skipped = results.filter(r => r.skipped);
  const failed = results.filter(r => !r.success);
  
  const totalOriginalSize = successful.reduce((sum, r) => sum + r.originalSize, 0);
  const totalWebPSize = successful.reduce((sum, r) => sum + r.webpSize, 0);
  const totalSavings = totalOriginalSize > 0 ? ((totalOriginalSize - totalWebPSize) / totalOriginalSize * 100) : 0;
  
  return {
    total: results.length,
    successful: successful.length,
    skipped: skipped.length,
    failed: failed.length,
    totalOriginalSize,
    totalWebPSize,
    totalSavings
  };
};

// Main function
const optimizeImages = () => {
  console.log('🔍 Checking image directories...');
  const directories = checkDirectories();
  
  if (!directories) {
    process.exit(1);
  }
  
  console.log('\n🔍 Finding images to optimize...');
  const images = findImages(directories);
  
  if (images.length === 0) {
    console.log('❌ No images found to optimize');
    return;
  }
  
  console.log(`📊 Found ${images.length} images to optimize`);
  
  console.log('\n🔧 Checking WebP tools...');
  const hasWebPTools = checkWebPTools();
  
  if (!hasWebPTools) {
    console.log('⚠️  Cannot proceed without WebP tools');
    process.exit(1);
  }
  
  console.log('\n🚀 Starting conversion...');
  const results = [];
  
  images.forEach((image, index) => {
    const progress = Math.round((index + 1) / images.length * 100);
    process.stdout.write(`\r⏳ Progress: ${progress}% (${index + 1}/${images.length})`);
    
    const result = convertToWebP(image);
    results.push(result);
  });
  
  console.log('\n\n📈 Optimization Results:');
  console.log('========================');
  
  const stats = analyzeResults(results);
  
  console.log(`Total images: ${stats.total}`);
  console.log(`Successfully converted: ${stats.successful}`);
  console.log(`Skipped (already WebP): ${stats.skipped}`);
  console.log(`Failed: ${stats.failed}`);
  
  if (stats.successful > 0) {
    console.log(`\n💾 Size reduction:`);
    console.log(`  Original: ${(stats.totalOriginalSize / 1024 / 1024).toFixed(2)} MB`);
    console.log(`  WebP: ${(stats.totalWebPSize / 1024 / 1024).toFixed(2)} MB`);
    console.log(`  Savings: ${stats.totalSavings.toFixed(1)}%`);
  }
  
  if (stats.failed > 0) {
    console.log(`\n❌ Failed conversions:`);
    results.filter(r => !r.success).forEach(r => {
      console.log(`  - ${r.error}`);
    });
  }
  
  // Générer le rapport
  const report = {
    timestamp: new Date().toISOString(),
    stats,
    results
  };
  
  fs.writeFileSync('image-optimization-report.json', JSON.stringify(report, null, 2));
  console.log(`\n📄 Detailed report saved to image-optimization-report.json`);
  
  console.log('\n🎉 Image optimization completed!');
  
  if (stats.successful > 0) {
    console.log(`💡 Tips:`);
    console.log(`  - Update your image components to use .webp versions first`);
    console.log(`  - Consider adding WebP fallbacks in your image components`);
    console.log(`  - Test WebP support in older browsers`);
  }
};

// Exécuter l'optimisation
optimizeImages();
