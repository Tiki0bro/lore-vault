/**
 * Comprehensive E2E Test Harness for Category UX & Intuitive Navigation Redesign
 * Verifies Category Dock Bar, Segmented Controls, Contextual Sub-Category Bar, and Omni-Search Badges.
 */

const fs = require('fs');
const assert = require('assert');
const { JSDOM } = require('jsdom');

console.log('🚀 Starting Category UX Redesign E2E Master Verification...\n');

// ==========================================
// 1. Run Sub-Suite: Category Dock Bar
// ==========================================
console.log('--- 1. Testing Category Dock Bar ---');
require('./test-category-dock.js');
console.log('');

// ==========================================
// 2. Run Sub-Suite: Segmented Controls
// ==========================================
console.log('--- 2. Testing Segmented Controls ---');
require('./test-segmented-controls.js');
console.log('');

// ==========================================
// 3. Run Sub-Suite: Contextual Sub-Category Bar
// ==========================================
console.log('--- 3. Testing Contextual Sub-Category Bar ---');
require('./test-subcategory-bar.js');
console.log('');

// ==========================================
// 4. Run Sub-Suite: Omni-Search Badge Previews
// ==========================================
console.log('--- 4. Testing Omni-Search Badge Previews ---');

const html = fs.readFileSync('public/index.html', 'utf8');
const css = fs.readFileSync('public/css/styles.css', 'utf8');
const appJs = fs.readFileSync('public/js/app.js', 'utf8');
const badgesJs = fs.readFileSync('public/js/badges.js', 'utf8');

// Assert static source code definitions
assert.ok(appJs.includes('getCategoryBadgeClass'), 'app.js must implement getCategoryBadgeClass');
assert.ok(appJs.includes('catBadgeClass'), 'app.js must compute catBadgeClass in renderSearchResultsDropdown');
assert.ok(css.includes('.search-result-badge'), 'styles.css must contain .search-result-badge');

// Setup JSDOM environment for Omni-Search rendering test
const dom = new JSDOM(html, { url: "http://localhost", runScripts: "outside-only" });
const { window } = dom;

window.fetch = async () => ({ json: async () => [] });

// Load badges.js and app.js into JSDOM window
window.eval(badgesJs);
window.eval(appJs);

const app = new window.LoreApp();
window.app = app;

const sampleResults = [
  { id: '101', title: 'High Elves', category: 'Races & Species', summary: 'Elven kingdom lore' },
  { id: '102', title: 'Aether Citadel', category: 'Locations', summary: 'Ancient hovering fortress' },
  { id: '103', title: 'Ironclad Guild', category: 'Factions', summary: 'Mercenary guild' }
];

app.searchResults = sampleResults;
app.renderSearchResultsDropdown(sampleResults, 'test', null, null);

const dropdown = window.document.getElementById('search-results-dropdown');
assert.ok(dropdown, '#search-results-dropdown container must exist in DOM');
assert.ok(!dropdown.classList.contains('hidden'), '#search-results-dropdown must be visible after rendering');

const items = dropdown.querySelectorAll('.search-result-item');
assert.strictEqual(items.length, 3, 'Should render 3 search result items');

const firstBadge = items[0].querySelector('.search-result-badge');
assert.ok(firstBadge, 'First search result must contain a category badge pill');
assert.ok(firstBadge.classList.contains('badge-racesspecies'), 'Badge for Races & Species must include badge-racesspecies class');
assert.ok(firstBadge.textContent.includes('Races & Species'), 'Badge text must contain category name');
assert.ok(firstBadge.textContent.includes('🧬'), 'Badge text must contain category icon');

const secondBadge = items[1].querySelector('.search-result-badge');
assert.ok(secondBadge, 'Second search result must contain a category badge pill');
assert.ok(secondBadge.classList.contains('badge-locations'), 'Badge for Locations must include badge-locations class');
assert.ok(secondBadge.textContent.includes('Locations'), 'Badge text must contain category name');
assert.ok(secondBadge.textContent.includes('🏰'), 'Badge text must contain category icon');

console.log('✅ Omni-Search Badge Previews verified successfully!\n');

console.log('====================================================');
console.log('🎉 ✅ All Category UX Redesign tests passed 100%! 🎉');
console.log('====================================================');
