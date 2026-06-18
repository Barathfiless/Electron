const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, '..', 'mobile');
const destDir = path.join(__dirname, 'www');

// Helper to copy files
function copyFolderRecursiveSync(src, dest) {
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }

  const files = fs.readdirSync(src);
  for (const file of files) {
    const srcPath = path.join(src, file);
    const destPath = path.join(dest, file);
    const stat = fs.statSync(srcPath);

    if (stat.isDirectory()) {
      copyFolderRecursiveSync(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
      console.log(`Copied: ${file} -> www/`);
    }
  }
}

try {
  console.log('Syncing assets from mobile/ to mobile-app/www...');
  copyFolderRecursiveSync(srcDir, destDir);
  console.log('Asset sync completed successfully.');
} catch (err) {
  console.error('Error during asset sync:', err);
  process.exit(1);
}
