const fs = require('fs');
const path = require('path');

const source = path.join(__dirname, '../node_modules/sowpods/SOWPODS.txt');
const destDir = path.join(__dirname, '../public/dictionary');
const dest = path.join(destDir, 'sowpods.txt');

if (!fs.existsSync(source)) {
  console.warn('copy-dictionary: sowpods not installed, skipping');
  process.exit(0);
}

fs.mkdirSync(destDir, { recursive: true });
fs.copyFileSync(source, dest);
console.log('Copied SOWPODS dictionary to public/dictionary/sowpods.txt');
