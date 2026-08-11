const fs = require('fs');
const path = require('path');

console.log('Verifying UI file inclusions...');
const html = fs.readFileSync(path.join(__dirname, '..', 'public', 'index.html'), 'utf8');
const css = fs.readFileSync(path.join(__dirname, '..', 'public', 'css', 'styles.css'), 'utf8');
const jsExists = fs.existsSync(path.join(__dirname, '..', 'public', 'js', 'relationship-view.js'));

if (!html.includes('view-relationships')) {
  console.error('Test Failed: index.html missing view-relationships');
  process.exit(1);
}
if (!css.includes('.rel-matrix-table')) {
  console.error('Test Failed: styles.css missing .rel-matrix-table');
  process.exit(1);
}
if (!jsExists) {
  console.error('Test Failed: relationship-view.js file missing');
  process.exit(1);
}

console.log('Test Passed: All UI assets present and linked!');
process.exit(0);
