const fs = require('fs');
const assert = require('assert');

const html = fs.readFileSync('public/index.html', 'utf8');
const css = fs.readFileSync('public/css/styles.css', 'utf8');
const js = fs.readFileSync('public/js/app.js', 'utf8');

// HTML checks
assert.ok(html.includes('id="zen-mode-toggle"'), 'HTML must contain #zen-mode-toggle button');
assert.ok(html.includes('onclick="window.app.toggleZenMode()"'), 'HTML button must call window.app.toggleZenMode()');

// CSS checks
assert.ok(css.includes('.zen-mode'), 'CSS must contain .zen-mode styles');
assert.ok(css.includes('.view-panel.zen-mode .article-list-column'), 'CSS must collapse .article-list-column in zen-mode');
assert.ok(css.includes('.view-panel.zen-mode .article-detail-column'), 'CSS must expand .article-detail-column in zen-mode');

// JS checks
assert.ok(js.includes('toggleZenMode'), 'JS must implement toggleZenMode()');
assert.ok(js.includes('zen-mode'), 'JS must toggle zen-mode class');

console.log('✅ Zen Reader test passed!');
