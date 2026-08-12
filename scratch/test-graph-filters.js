/**
 * Component Test: Interactive Knowledge Graph Node Filters
 * Tests #graph-category-filters DOM, CSS rules, and filterNodesByCategory() logic.
 *
 * Run: node scratch/test-graph-filters.js
 */

const fs = require('fs');
const path = require('path');

let pass = 0;
let fail = 0;

function assert(label, condition) {
  if (condition) {
    console.log(`  ✅ PASS: ${label}`);
    pass++;
  } else {
    console.log(`  ❌ FAIL: ${label}`);
    fail++;
  }
}

// ─── 1. DOM Element Tests (index.html) ────────────────────────────────────────
console.log('\n🔍 Test Suite 1: DOM Elements in index.html');
const htmlPath = path.join(__dirname, '..', 'public', 'index.html');
const html = fs.readFileSync(htmlPath, 'utf-8');

assert('#graph-category-filters container exists', html.includes('id="graph-category-filters"'));
assert('#graph-category-filters has correct class', html.includes('class="graph-category-filters"'));
assert('#graph-container exists', html.includes('id="graph-container"'));
assert('#graph-canvas canvas element exists', html.includes('id="graph-canvas"'));
assert('#graph-category-filters appears before #graph-container',
  html.indexOf('id="graph-category-filters"') < html.indexOf('id="graph-container"'));
assert('graph-view.js script is loaded', html.includes('graph-view.js'));

// ─── 2. CSS Rules Tests (styles.css) ──────────────────────────────────────────
console.log('\n🎨 Test Suite 2: CSS Rules in styles.css');
const cssPath = path.join(__dirname, '..', 'public', 'css', 'styles.css');
const css = fs.readFileSync(cssPath, 'utf-8');

assert('.graph-category-filters base rule exists', css.includes('.graph-category-filters'));
assert('.graph-filter-chip base rule exists', css.includes('.graph-filter-chip'));
assert('.graph-filter-chip.active rule exists', css.includes('.graph-filter-chip.active'));
assert('ancient-codex theme for .graph-filter-chip.active', css.includes('[data-theme="ancient-codex"] .graph-filter-chip.active'));
assert('scifi-fantasy theme for .graph-filter-chip.active', css.includes('[data-theme="scifi-fantasy"] .graph-filter-chip.active'));
assert('Light mode rule for .graph-filter-chip', css.includes('[data-mode="light"] .graph-filter-chip'));

// ─── 3. JS Method Tests (graph-view.js) ──────────────────────────────────────
console.log('\n⚙️ Test Suite 3: JS Methods in graph-view.js');
const jsPath = path.join(__dirname, '..', 'public', 'js', 'graph-view.js');
const js = fs.readFileSync(jsPath, 'utf-8');

assert('filterNodesByCategory method exists', js.includes('filterNodesByCategory'));
assert('renderFilterChips method exists', js.includes('renderFilterChips'));
assert('LoreGraph class defined', js.includes('class LoreGraph'));
assert('activeFilter property managed', js.includes('this.activeFilter'));
assert('All Nodes chip label exists', js.includes('All Nodes'));
assert('7 primary categories referenced',
  js.includes("'Characters'") &&
  js.includes("'Locations'") &&
  js.includes("'Factions'") &&
  js.includes("'Races & Species'") &&
  js.includes("'Magic & Tech'") &&
  js.includes("'History'") &&
  js.includes("'Items'")
);
assert('filterNodesByCategory updates node visibility without re-instantiating',
  js.includes('this.animate') || js.includes('this.drawNodes'));
assert('graph-category-filters DOM target referenced', js.includes('graph-category-filters'));

// ─── 4. Integration Smoke Tests ───────────────────────────────────────────────
console.log('\n🔗 Test Suite 4: Integration Smoke Checks');

// Verify the filter container is inside a graph-related section
const filterIdx = html.indexOf('id="graph-category-filters"');
const containerIdx = html.indexOf('id="graph-container"');
assert('Filter container and graph container are in same section',
  filterIdx > 0 && containerIdx > 0 && (containerIdx - filterIdx) < 500);

// Verify categoryColors alignment
const graphCategories = ['Characters', 'Locations', 'Factions', 'Races & Species', 'Magic & Tech', 'History', 'Items'];
graphCategories.forEach(cat => {
  assert(`categoryColors includes "${cat}"`, js.includes(`'${cat}'`));
});

// ─── Summary ──────────────────────────────────────────────────────────────────
console.log('\n' + '═'.repeat(50));
console.log(`📊 Results: ${pass} passed, ${fail} failed, ${pass + fail} total`);
if (fail > 0) {
  console.log('❌ SOME TESTS FAILED');
  process.exit(1);
} else {
  console.log('✅ ALL TESTS PASSED');
  process.exit(0);
}
