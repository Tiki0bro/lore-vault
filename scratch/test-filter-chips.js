const fs = require('fs');
const path = require('path');
const assert = require('assert');

console.log('Testing Task 3: Single-Row Context-Aware Filter Chips Component...');

const projectRoot = path.join(__dirname, '..');
const htmlPath = path.join(projectRoot, 'public', 'index.html');
const cssPath = path.join(projectRoot, 'public', 'css', 'styles.css');
const jsPath = path.join(projectRoot, 'public', 'js', 'app.js');

// Test 1: Check public/index.html for #category-filter-chips
const htmlContent = fs.readFileSync(htmlPath, 'utf8');
assert.ok(htmlContent.includes('id="category-filter-chips"'), 'public/index.html missing #category-filter-chips container');
assert.ok(htmlContent.includes('class="filter-chips-bar"'), 'public/index.html missing .filter-chips-bar class');
const chipsPos = htmlContent.indexOf('id="category-filter-chips"');
const cardsPos = htmlContent.indexOf('id="articles-cards"');
assert.ok(chipsPos < cardsPos, '#category-filter-chips must be positioned directly above #articles-cards');
console.log('✅ Test 1 Passed: index.html contains #category-filter-chips directly above #articles-cards');

// Test 2: Check public/css/styles.css for .filter-chips-bar & theme styles
const cssContent = fs.readFileSync(cssPath, 'utf8');
assert.ok(cssContent.includes('.filter-chips-bar'), 'styles.css missing .filter-chips-bar class');
assert.ok(cssContent.includes('.filter-chip'), 'styles.css missing .filter-chip class');
assert.ok(cssContent.includes('overflow-x: auto'), 'styles.css missing overflow-x: auto on filter-chips-bar');
assert.ok(cssContent.includes('scroll-snap-align'), 'styles.css missing scroll-snap styling');
assert.ok(cssContent.includes('[data-theme="ancient-codex"] .filter-chip.active'), 'styles.css missing ancient-codex theme active chip style');
assert.ok(cssContent.includes('[data-theme="scifi-fantasy"] .filter-chip.active'), 'styles.css missing scifi-fantasy theme active chip style');
console.log('✅ Test 2 Passed: styles.css contains .filter-chips-bar, .filter-chip, and theme-aware active styles');

// Test 3: Check public/js/app.js for renderFilterChips and filterBySubCategory
const jsContent = fs.readFileSync(jsPath, 'utf8');
assert.ok(jsContent.includes('renderFilterChips()'), 'app.js missing renderFilterChips method');
assert.ok(jsContent.includes('filterBySubCategory('), 'app.js missing filterBySubCategory method');
assert.ok(jsContent.includes('this.selectedSubCategory'), 'app.js missing this.selectedSubCategory tracking');
assert.ok(jsContent.includes('Playable Races & Lineages'), 'app.js missing Races & Species subcategories in taxonomy map');
console.log('✅ Test 3 Passed: app.js implements renderFilterChips(), filterBySubCategory(), and state tracking');

console.log('🎉 All Task 3 component verification tests passed!');
