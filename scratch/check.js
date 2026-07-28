const fs = require('fs');
const lines = fs.readFileSync('public/js/app.js', 'utf8').split('\n');
lines.forEach((l, i) => {
  if (l.includes("classList.add('hidden')")) {
    console.log((i+1) + ': ' + l.trim());
  }
});
