const fs = require('fs');
const assert = require('assert');

console.log('Testing Category Dock DOM, CSS, and JS structure...');

const html = fs.readFileSync('public/index.html', 'utf8');
const css = fs.readFileSync('public/css/styles.css', 'utf8');
const appJs = fs.readFileSync('public/js/app.js', 'utf8');

// 1. Assert HTML container existence
assert.ok(html.includes('id="category-dock-bar"'), 'HTML must contain #category-dock-bar container');

// 2. Assert CSS rule declarations
assert.ok(css.includes('.category-dock-bar'), 'CSS must include styling for .category-dock-bar');
assert.ok(css.includes('.category-dock-pill'), 'CSS must include styling for .category-dock-pill');
assert.ok(css.includes('.dock-count-badge'), 'CSS must include styling for .dock-count-badge');

// Assert theme active states in CSS
assert.ok(css.includes('.category-dock-pill.active'), 'CSS must include active state styling for .category-dock-pill');
assert.ok(css.includes('scifi-fantasy') && css.includes('.category-dock-pill.active'), 'CSS must support sci-fi theme active state');
assert.ok(css.includes('light') && css.includes('.category-dock-pill'), 'CSS must support light mode styling for dock pills');

// 3. Assert JS implementation in app.js
assert.ok(appJs.includes('renderCategoryDock'), 'app.js must implement renderCategoryDock method');

console.log('✅ Category Dock component structure verified!');
