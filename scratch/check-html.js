const fs = require('fs');
const html = fs.readFileSync('public/index.html', 'utf8');
const lines = html.split('\n');
lines.forEach((l, i) => {
  if (l.includes('<section id="view-studio"') || l.includes('</main>')) {
    console.log((i+1) + ': ' + l.trim());
  }
});
