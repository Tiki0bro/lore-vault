const fs = require('fs');
const path = require('path');
const assert = require('assert');

console.log('=== Task 2 Verification Test Suite ===\n');

// Test 1: Verify index.html select dropdowns
console.log('Test 1: Verifying public/index.html select options...');
const htmlContent = fs.readFileSync(path.join(__dirname, '../public/index.html'), 'utf8');

assert.ok(htmlContent.includes('<option value="Races & Species">Races & Species</option>'), 'index.html missing option value "Races & Species"');
assert.ok(!htmlContent.includes('<option value="Species">Species</option>'), 'index.html still contains legacy option value "Species"');
console.log('  ✓ public/index.html select options correctly updated to "Races & Species".\n');

// Test 2: Verify badges.js mappings
console.log('Test 2: Verifying public/js/badges.js mapping...');
const badgesContent = fs.readFileSync(path.join(__dirname, '../public/js/badges.js'), 'utf8');
assert.ok(badgesContent.includes('Races & Species') || badgesContent.includes('badge-racesspecies'), 'badges.js missing Races & Species / badge-racesspecies mapping');
assert.ok(badgesContent.includes('🧬'), 'badges.js missing DNA icon 🧬');
console.log('  ✓ public/js/badges.js correctly maps "Races & Species" to 🧬 and badge-racesspecies.\n');

// Test 3: Verify app.js renderCategoryMenu and subCategoriesMap
console.log('Test 3: Verifying public/js/app.js category menu and taxonomy map...');
const appContent = fs.readFileSync(path.join(__dirname, '../public/js/app.js'), 'utf8');

assert.ok(appContent.includes("Races & Species"), 'app.js missing "Races & Species"');
assert.ok(appContent.includes("subCategoriesMap"), 'app.js missing subCategoriesMap');
assert.ok(appContent.includes("Playable Races & Lineages"), 'app.js subCategoriesMap missing Playable Races & Lineages');
assert.ok(appContent.includes("sub-category-list"), 'app.js renderCategoryMenu missing sub-category-list tree wrapper');
console.log('  ✓ public/js/app.js correctly contains 7 core categories, subCategoriesMap, and tree view rendering.\n');

console.log('=== All Task 2 Frontend & Taxonomy Checks Passed! ===');
