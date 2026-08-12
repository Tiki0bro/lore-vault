const fs = require('fs');
const assert = require('assert');

console.log('Testing Segmented Controls DOM, CSS, and JS logic...');

const html = fs.readFileSync('public/index.html', 'utf8');
const css = fs.readFileSync('public/css/styles.css', 'utf8');
const appJs = fs.readFileSync('public/js/app.js', 'utf8');

// 1. Verify index.html does NOT contain native select for sort-select
assert.strictEqual(html.includes('<select id="sort-select"'), false, 'HTML should not contain native <select id="sort-select">');

// 2. Verify index.html contains .segmented-control and sort segmented buttons
assert.ok(html.includes('class="segmented-control"'), 'HTML must contain class="segmented-control"');
assert.ok(html.includes('data-sort="updated"') || html.includes("handleSortSegment('updated')"), 'HTML must contain sort button for updated');
assert.ok(html.includes('data-sort="title"') || html.includes("handleSortSegment('title')"), 'HTML must contain sort button for title');
assert.ok(html.includes('data-sort="category"') || html.includes("handleSortSegment('category')"), 'HTML must contain sort button for category');

// 3. Verify edit-category and chat-category-filter upgrade in HTML
assert.ok(html.includes('id="edit-category-segmented"') || html.includes('id="edit-category-popover"') || html.includes('class="segmented-control-category"'), 'HTML must contain upgraded edit-category control container/segmented group');
assert.ok(html.includes('id="chat-category-segmented"') || html.includes('id="chat-category-popover"') || html.includes('class="segmented-control-chat-category"'), 'HTML must contain upgraded chat-category-filter control container/segmented group');

// 4. Verify CSS rules in styles.css
assert.ok(css.includes('.segmented-control'), 'styles.css must contain .segmented-control');
assert.ok(css.includes('.segmented-btn'), 'styles.css must contain .segmented-btn');
assert.ok(css.includes('.segmented-btn.active') || css.includes('.segmented-btn:hover'), 'styles.css must contain active/hover styles for .segmented-btn');

// 5. Verify JS event handlers in app.js
assert.ok(appJs.includes('handleSortSegment'), 'app.js must implement handleSortSegment method');

console.log('✅ Segmented Controls tests verified!');
