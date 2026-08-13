const fs = require('fs');
const path = require('path');

const publicJsDir = path.join(__dirname, '..', 'public', 'js');
const indexHtmlPath = path.join(__dirname, '..', 'public', 'index.html');

const htmlContent = fs.readFileSync(indexHtmlPath, 'utf8');

// Extract all IDs from index.html
const htmlIds = new Set();
const idRegex = /id=["']([^"']+)["']/g;
let match;
while ((match = idRegex.exec(htmlContent)) !== null) {
  htmlIds.add(match[1]);
}

console.log(`Found ${htmlIds.size} unique IDs in index.html.\n`);

const jsFiles = fs.readdirSync(publicJsDir).filter(f => f.endsWith('.js'));
let missingCount = 0;
const missingMap = {};

jsFiles.forEach(file => {
  const filePath = path.join(publicJsDir, file);
  const content = fs.readFileSync(filePath, 'utf8');
  
  // Find document.getElementById('...') calls
  const getElemRegex = /document\.getElementById\s*\(\s*['"`]([^'"`]+)['"`]\s*\)/g;
  let elemMatch;
  while ((elemMatch = getElemRegex.exec(content)) !== null) {
    const idName = elemMatch[1];
    if (!htmlIds.has(idName) && !idName.includes('${')) {
      if (!missingMap[file]) missingMap[file] = new Set();
      missingMap[file].add(idName);
      missingCount++;
    }
  }
});

console.log('=== MISSING DOM IDs referenced in JS but absent in index.html ===');
for (const [file, ids] of Object.entries(missingMap)) {
  console.log(`\nIn ${file}:`);
  ids.forEach(id => console.log(`  - #${id}`));
}

if (missingCount === 0) {
  console.log('All static getElementById calls matched elements in index.html!');
}
