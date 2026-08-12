const fs = require('fs');
const assert = require('assert');
const { JSDOM } = require('jsdom');

console.log('Testing Contextual Sub-Category Bar DOM, CSS, and JS logic...');

const html = fs.readFileSync('public/index.html', 'utf8');
const css = fs.readFileSync('public/css/styles.css', 'utf8');
const appJs = fs.readFileSync('public/js/app.js', 'utf8');

// 1. Verify index.html structure
assert.ok(html.includes('id="sub-category-bar"'), 'HTML must contain #sub-category-bar container');

const dockBarIndex = html.indexOf('id="category-dock-bar"');
const subCategoryBarIndex = html.indexOf('id="sub-category-bar"');
assert.ok(dockBarIndex !== -1, '#category-dock-bar must exist');
assert.ok(subCategoryBarIndex !== -1, '#sub-category-bar must exist');
assert.ok(subCategoryBarIndex > dockBarIndex, '#sub-category-bar must be below #category-dock-bar in index.html');

// 2. Verify CSS rules in styles.css
assert.ok(css.includes('.sub-category-bar'), 'styles.css must contain .sub-category-bar');
assert.ok(css.includes('.sub-category-chip'), 'styles.css must contain .sub-category-chip');
assert.ok(css.includes('.sub-chip-count'), 'styles.css must contain .sub-chip-count');
assert.ok(css.includes('.clear-filter-chip'), 'styles.css must contain .clear-filter-chip');

// Theme active states check
assert.ok(css.includes('.sub-category-chip.active'), 'styles.css must contain .sub-category-chip.active styling');
assert.ok(css.includes('scifi-fantasy') && css.includes('.sub-category-chip'), 'styles.css must support sci-fi theme for sub-category chips');
assert.ok(css.includes('light') && css.includes('.sub-category-chip'), 'styles.css must support light mode for sub-category chips');

// 3. Verify JS methods and wiring in app.js
assert.ok(appJs.includes('renderSubCategoryBar'), 'app.js must implement renderSubCategoryBar');
assert.ok(appJs.includes('clearCategoryFilters'), 'app.js must implement clearCategoryFilters');
assert.ok(appJs.includes('this.renderSubCategoryBar()'), 'app.js should call this.renderSubCategoryBar()');

// 4. Runtime JSDOM verification of subcategory rendering & clear filter action
const dom = new JSDOM(html, { url: "http://localhost", runScripts: "outside-only" });
const { window } = dom;

// Mock window.fetch for node environment
window.fetch = async () => ({ json: async () => [] });

window.eval(appJs);

const app = new window.LoreApp();
window.app = app;

// Mock data
app.categories = [
  {
    category: 'Races & Species',
    count: 8,
    subCategories: [
      { subCategory: 'Playable Races & Lineages', count: 4 },
      { subCategory: 'Beasts & Creatures', count: 4 }
    ]
  }
];
app.articles = [
  { id: '1', title: 'High Elves', category: 'Races & Species', sub_category: 'Playable Races & Lineages' },
  { id: '2', title: 'Frost Dragons', category: 'Races & Species', sub_category: 'Beasts & Creatures' }
];

// Test 1: Hidden when no primary category is selected and no filter active
app.filterByCategory(null);
const subBarEl = window.document.getElementById('sub-category-bar');
assert.ok(subBarEl.classList.contains('hidden'), 'Sub-category bar should be hidden when no category is selected');

// Test 2: Active when primary category selected ('Races & Species')
app.filterByCategory('Races & Species');
assert.ok(!subBarEl.classList.contains('hidden'), 'Sub-category bar should be visible when primary category is selected');

const clearBtn = subBarEl.querySelector('.clear-filter-chip');
assert.ok(clearBtn, 'Clear filter chip must be present in sub-category bar');

const chips = subBarEl.querySelectorAll('.sub-category-chip');
assert.ok(chips.length >= 3, 'Should render All chip + standard subcategory chips');

// Check counts in chips
const playableChip = Array.from(chips).find(c => c.textContent.includes('Playable Races & Lineages'));
assert.ok(playableChip, 'Playable Races & Lineages chip should be rendered');
assert.ok(playableChip.textContent.includes('4'), 'Playable Races & Lineages chip count badge should show 4');

// Test 3: Clear category filters
app.clearCategoryFilters();
assert.strictEqual(app.selectedCategory, null, 'selectedCategory should be reset to null after clearCategoryFilters');
assert.strictEqual(app.selectedSubCategory, null, 'selectedSubCategory should be reset to null after clearCategoryFilters');
assert.ok(subBarEl.classList.contains('hidden'), 'Sub-category bar should be hidden after clearing filters');

console.log('✅ Contextual Sub-Category Bar structure & logic verified!');
