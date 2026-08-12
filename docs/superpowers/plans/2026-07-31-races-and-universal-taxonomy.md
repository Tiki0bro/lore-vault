# Races & Species and Universal Taxonomy Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the `Races & Species` category (renamed from `Species`) and establish an expanded, 4-tier sub-category taxonomy across all 7 primary categories with responsive sidebar tree nodes, single-row filter chips, and AI smart classifier updates.

**Architecture:** Express/SQLite backend handles startup database migrations and heuristic sub-category classification (`smartCategorizeArticle`). Vanilla JS frontend (`app.js`, `badges.js`) manages the progressive disclosure tree nodes, context-aware filter chips bar, and unified state filtering.

**Tech Stack:** Node.js, Express, SQLite3, Vanilla JavaScript (ES6+), HTML5, CSS flexbox/grid.

## Global Constraints

- **Single-Responsibility & Modular Units**: Keep functions focused and files under ~200 lines where possible.
- **WorldAnvil Article Format**: Follow standard WorldAnvil syntax (`@[Title](template:id)`).
- **Theme Support**: UI components must support both `ancient-codex` (Parchment) and `scifi-fantasy` (Aether/Cyan) theme modes.
- **Empirical Verification**: Run test scripts and confirm green output before declaring tasks complete.

---

### Task 1: Backend Migration & Smart Auto-Classifier Update

**Files:**
- Modify: `server.js:104-120`, `server.js:2193-2258`
- Create: `scratch/test-taxonomy-backend.js`

**Interfaces:**
- Consumes: SQLite `articles` table, article title/content strings
- Produces: Updated `category = 'Races & Species'`, multi-tier `sub_category` string mapping

- [ ] **Step 1: Write backend test script**

```javascript
// scratch/test-taxonomy-backend.js
const assert = require('assert');
const { smartCategorizeArticle } = require('../server.js'); // Exported or tested via helper

console.log('Testing Smart Categorizer taxonomy outputs...');

// Test 1: Races & Species classification
const raceResult = smartCategorizeArticle('High Elven Lineage', 'The High Elves are an ancient playable race of noble lineage.');
assert.strictEqual(raceResult.category, 'Races & Species');
assert.strictEqual(raceResult.subCategory, 'Playable Races & Lineages');

// Test 2: History classification
const historyResult = smartCategorizeArticle('The Shattering War', 'A tragic war fought during the second era of the world.');
assert.strictEqual(historyResult.category, 'History');
assert.strictEqual(historyResult.subCategory, 'Wars & Battles');

// Test 3: Items classification
const itemResult = smartCategorizeArticle('Vorpal Blade', 'An ancient forged weapon and razor blade.');
assert.strictEqual(itemResult.category, 'Items');
assert.strictEqual(itemResult.subCategory, 'Weapons & Armaments');

console.log('✅ All backend categorizer tests passed!');
```

- [ ] **Step 2: Run test script to verify failure**

Run: `node scratch/test-taxonomy-backend.js`  
Expected: Fail or mismatch on `'Races & Species'` and sub-categories.

- [ ] **Step 3: Update `server.js` startup migration & classifier**

In `server.js`, add database migration on startup:
```javascript
db.run("UPDATE articles SET category = 'Races & Species' WHERE category = 'Species'");
```

Update `smartCategorizeArticle` in `server.js`:
```javascript
function smartCategorizeArticle(title, rawContent, filename = '') {
  const content = rawContent || '';
  const cleanTitle = (title || '').toLowerCase();
  const textLower = (title + ' ' + content + ' ' + filename).toLowerCase();

  const scores = {
    'Characters': 0,
    'Locations': 0,
    'Factions': 0,
    'Races & Species': 0,
    'Magic & Tech': 0,
    'History': 0,
    'Items': 0
  };

  // Title & body signal scoring logic...
  if (/\b(species|race|humanoid|elf|elves|dwarf|dwarves|orc|orcs|dragon|dragons|fae|beast|monster|lineage|ancestry)\b/i.test(cleanTitle)) scores['Races & Species'] += 5;
  // ...
  
  // Sub-category assignments for all 7 primary categories
  let subCategory = 'General';
  if (topCategory === 'Races & Species') {
    if (/playable|race|ancestry|lineage|elf|dwarf|human|tiefling|dragonborn|halfling|gnome|subrace|culture/i.test(textLower)) subCategory = 'Playable Races & Lineages';
    else if (/beast|creature|animal|fauna|mount|pet|wild|aquatic/i.test(textLower)) subCategory = 'Beasts & Creatures';
    else if (/monster|aberration|fiend|demon|devil|undead|dragon|construct|boss|horror/i.test(textLower)) subCategory = 'Monsters & Entities';
    else if (/flora|plant|herb|flower|fungus|tree|ecosystem/i.test(textLower)) subCategory = 'Flora & Ecology';
    else subCategory = 'Playable Races & Lineages';
  } else if (topCategory === 'History') {
    if (/war|battle|siege|clash/i.test(textLower)) subCategory = 'Wars & Battles';
    else if (/era|age|century|epoch/i.test(textLower)) subCategory = 'Eras & Ages';
    else if (/treaty|accord|pact|pardon/i.test(textLower)) subCategory = 'Treaties & Accords';
    else subCategory = 'Chronicles & Key Events';
  } else if (topCategory === 'Items') {
    if (/sword|blade|bow|staff|weapon|armaments/i.test(textLower)) subCategory = 'Weapons & Armaments';
    else if (/armor|shield|relic|helm|plate/i.test(textLower)) subCategory = 'Armor & Relics';
    else if (/potion|elixir|salve|reagent|ingredient/i.test(textLower)) subCategory = 'Potions & Reagents';
    else subCategory = 'Trinkets & Valuables';
  }
  // ... (Locations, Characters, Factions, Magic & Tech)

  return { category: topCategory, subCategory, summary: firstParagraph };
}
```

- [ ] **Step 4: Run test script to verify pass**

Run: `node scratch/test-taxonomy-backend.js`  
Expected: PASS with "✅ All backend categorizer tests passed!"

- [ ] **Step 5: Commit changes**

```bash
git add server.js scratch/test-taxonomy-backend.js
git commit -m "feat: implement Races & Species DB migration and universal sub-category classifier"
```

---

### Task 2: Frontend Dropdowns, Badges, and Sidebar Tree View

**Files:**
- Modify: `public/index.html:755-765`, `public/index.html:1320-1326`
- Modify: `public/js/badges.js:30-60`
- Modify: `public/js/app.js:1555-1600`

**Interfaces:**
- Consumes: API articles array, category menu DOM container `#category-list`
- Produces: Updated select options, SVG/CSS category badges, dynamic sub-category tree nodes

- [ ] **Step 1: Update HTML select options in `index.html`**

In `public/index.html`, update `#edit-category` and `#chat-category-filter` options:
```html
<option value="Characters">Characters</option>
<option value="Locations">Locations</option>
<option value="Factions">Factions</option>
<option value="Races & Species">Races & Species</option>
<option value="Magic & Tech">Magic & Tech</option>
<option value="History">History</option>
<option value="Items">Items</option>
```

- [ ] **Step 2: Update category badge mappings in `badges.js`**

Update `window.LoreBadges` in `public/js/badges.js`:
```javascript
const categoryIcons = {
  'Characters': '👤',
  'Locations': '🏰',
  'Factions': '🛡️',
  'Races & Species': '🧬',
  'Magic & Tech': '🔮',
  'History': '📜',
  'Items': '🗡️'
};
```

- [ ] **Step 3: Update `renderCategoryMenu()` in `app.js`**

In `public/js/app.js`, update `renderCategoryMenu()` to support expanding sub-categories under any active primary category:
```javascript
renderCategoryMenu() {
  const listEl = document.getElementById('category-list');
  if (!listEl) return;

  const categories = [
    'Characters', 'Locations', 'Factions', 'Races & Species',
    'Magic & Tech', 'History', 'Items'
  ];

  const subCategoriesMap = {
    'Characters': ['Rulers & Nobility', 'Mages & Mystics', 'Warriors & Officers', 'Key Figures & Personages'],
    'Locations': ['Cities & Settlements', 'Fortresses & Strongholds', 'Realms & Territories', 'Geography & Wilderness', 'Landmarks & Ruins'],
    'Factions': ['Noble Houses & Dynasties', 'Syndicates & Guilds', 'Military Orders', 'Organizations & Societies'],
    'Races & Species': ['Playable Races & Lineages', 'Beasts & Creatures', 'Monsters & Entities', 'Flora & Ecology'],
    'Magic & Tech': ['Spells & Incantations', 'Arcane Artifacts & Catalysts', 'Technology & Machinery', 'Magic Systems & Theories'],
    'History': ['Eras & Ages', 'Wars & Battles', 'Treaties & Accords', 'Chronicles & Key Events'],
    'Items': ['Weapons & Armaments', 'Armor & Relics', 'Potions & Reagents', 'Trinkets & Valuables']
  };

  // Render parent category items and sub-category tree nodes...
}
```

- [ ] **Step 4: Manual UI check**

Run local server (`npm start` or `node server.js`) and inspect browser at `http://localhost:3000` to verify sidebar rendering.

- [ ] **Step 5: Commit changes**

```bash
git add public/index.html public/js/badges.js public/js/app.js
git commit -m "feat: update UI category select options, badges, and sidebar sub-category tree"
```

---

### Task 3: Single-Row Context-Aware Filter Chips Component

**Files:**
- Modify: `public/index.html:113-125`
- Modify: `public/css/styles.css`
- Modify: `public/js/app.js`

**Interfaces:**
- Consumes: Selected primary category state (`this.selectedCategory`)
- Produces: Single-row horizontal scrollable chip bar `#category-filter-chips` with active toggle events

- [ ] **Step 1: Add `#category-filter-chips` container in `index.html`**

In `public/index.html` inside `.article-list-column`:
```html
<div class="list-header">
  <span id="article-count">0 Articles</span>
  <select id="sort-select" onchange="window.app.handleSort(this.value)">...</select>
</div>
<div id="category-filter-chips" class="filter-chips-bar">
  <!-- Dynamically populated filter chips -->
</div>
```

- [ ] **Step 2: Add CSS styles in `public/css/styles.css`**

```css
.filter-chips-bar {
  display: flex;
  gap: 0.4rem;
  padding: 0.4rem 0.6rem;
  overflow-x: auto;
  white-space: nowrap;
  scroll-behavior: smooth;
  border-bottom: 1px solid var(--border-color);
  background: var(--bg-card);
}

.filter-chip {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  padding: 0.25rem 0.65rem;
  border-radius: 12px;
  font-size: 0.75rem;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid var(--border-color);
  color: var(--text-muted);
  cursor: pointer;
  transition: all 0.2s ease;
}

.filter-chip.active {
  background: var(--accent-gold, #d97706);
  color: #fff;
  border-color: var(--accent-gold, #d97706);
  font-weight: 600;
}
```

- [ ] **Step 3: Implement `renderFilterChips()` in `app.js`**

In `public/js/app.js`:
```javascript
renderFilterChips() {
  const container = document.getElementById('category-filter-chips');
  if (!container) return;

  const currentCat = this.selectedCategory;
  let chips = ['All'];
  if (currentCat && subCategoriesMap[currentCat]) {
    chips = ['All', ...subCategoriesMap[currentCat]];
  }

  container.innerHTML = chips.map(chip => `
    <button class="filter-chip ${this.selectedSubCategory === chip || (!this.selectedSubCategory && chip === 'All') ? 'active' : ''}"
            onclick="window.app.filterBySubCategory('${chip}')">
      ${chip}
    </button>
  `).join('');
}
```

- [ ] **Step 4: Verify single-row chip bar rendering in browser**

Ensure no horizontal layout overflow occurs on `.article-list-column`.

- [ ] **Step 5: Commit changes**

```bash
git add public/index.html public/css/styles.css public/js/app.js
git commit -m "feat: add single-row context-aware filter chips bar for article lists"
```

---

### Task 4: AI Context Builder & E2E Integration Verification

**Files:**
- Modify: `public/js/context-builder.js`
- Create: `scratch/test-taxonomy-integration.js`

**Interfaces:**
- Consumes: Articles array with `category = 'Races & Species'`
- Produces: Verified LLM prompt payloads & successful API responses

- [ ] **Step 1: Update `context-builder.js` category tag handling**

In `public/js/context-builder.js`, ensure `category` filter checks handle `'Races & Species'` without string truncation or regex errors.

- [ ] **Step 2: Create E2E integration test script**

```javascript
// scratch/test-taxonomy-integration.js
const http = require('http');

console.log('Testing API endpoints for Races & Species category...');

http.get('http://localhost:3000/api/articles', (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    const articles = JSON.parse(data);
    console.log(`Retrieved ${articles.length} articles from API.`);
    console.log('✅ Integration test passed!');
  });
}).on('error', (err) => {
  console.error('❌ Server not running or error occurred:', err.message);
  process.exit(1);
});
```

- [ ] **Step 3: Run integration test script**

Run: `node scratch/test-taxonomy-integration.js`  
Expected: PASS with "✅ Integration test passed!"

- [ ] **Step 4: Commit changes**

```bash
git add public/js/context-builder.js scratch/test-taxonomy-integration.js
git commit -m "test: add integration test suite for Races & Species taxonomy"
```
