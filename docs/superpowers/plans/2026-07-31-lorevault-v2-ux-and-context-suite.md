# LoreVault v2 UI/UX & Context Suite Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement 5 major UI/UX enhancements: Zen Reader Focus Mode, `@` Cross-Link Auto-Complete Tooltip, Visual Token Capacity Gauge, Interactive Graph Node Filters, and `+ Add to Scene Slate` reader action.

**Architecture:** Vanilla JS modules (`app.js`, `context-builder.js`, `graph-view.js`) manage component state and event delegation. CSS flex/grid animations (`styles.css`) provide theme-aware rendering across `ancient-codex`, `scifi-fantasy`, and Parchment light mode.

**Tech Stack:** JavaScript (ES6+), HTML5, CSS Variables, Vis.js / Canvas graph rendering.

## Global Constraints

- **Single-Responsibility & Modular Units**: Keep functions focused and files under ~200 lines where possible.
- **Zero Layout Overflow**: Ensure responsive flex wrapping and zero horizontal page overflow.
- **Theme Parity**: All 5 components must support `ancient-codex`, `scifi-fantasy`, and Light mode tokens.
- **Empirical Verification**: Run test scripts and confirm 100% green output for every task.

---

### Task 1: Zen Reader / Focus Mode Toggle

**Files:**
- Modify: `public/index.html:128-140`
- Modify: `public/css/styles.css`
- Modify: `public/js/app.js`
- Create: `scratch/test-zen-reader.js`

**Interfaces:**
- Consumes: User click or `Ctrl + Shift + F` shortcut
- Produces: Collapsed sidebars and 100% width centered reader canvas (`.zen-mode`)

- [ ] **Step 1: Write test harness**

```javascript
// scratch/test-zen-reader.js
const fs = require('fs');
const assert = require('assert');

const html = fs.readFileSync('public/index.html', 'utf8');
const css = fs.readFileSync('public/css/styles.css', 'utf8');
const js = fs.readFileSync('public/js/app.js', 'utf8');

assert.ok(html.includes('id="zen-mode-toggle"'), 'HTML must contain #zen-mode-toggle button');
assert.ok(css.includes('.zen-mode'), 'CSS must contain .zen-mode styles');
assert.ok(js.includes('toggleZenMode'), 'JS must implement toggleZenMode()');

console.log('✅ Zen Reader test passed!');
```

- [ ] **Step 2: Implement HTML, CSS, and JS logic**

Add `#zen-mode-toggle` in reader action bar in `index.html`.
Add `.zen-mode` CSS rules in `styles.css`.
Implement `toggleZenMode()` and shortcut listener in `app.js`.

- [ ] **Step 3: Run test script to verify pass**

Run: `node scratch/test-zen-reader.js`  
Expected: PASS with "✅ Zen Reader test passed!"

- [ ] **Step 4: Commit changes**

```bash
git add public/index.html public/css/styles.css public/js/app.js scratch/test-zen-reader.js
git commit -m "feat: add Zen Reader focus mode toggle and keyboard shortcut"
```

---

### Task 2: `@` Cross-Link Auto-Complete Tooltip

**Files:**
- Modify: `public/index.html:760-790`
- Modify: `public/css/styles.css`
- Modify: `public/js/app.js`
- Create: `scratch/test-crosslink-popover.js`

**Interfaces:**
- Consumes: Textarea keyup events matching `@`
- Produces: Floating popover `#crosslink-popover` inserting `@[Title](id)` syntax

- [ ] **Step 1: Write test harness**

Create `scratch/test-crosslink-popover.js` asserting `#crosslink-popover` DOM element and JS handler.

- [ ] **Step 2: Implement HTML, CSS, and JS logic**

Add `#crosslink-popover` element in `index.html`.
Add `.crosslink-popover` styles in `styles.css`.
Implement `@` detection and insertion logic in `app.js`.

- [ ] **Step 3: Run test script to verify pass**

Run: `node scratch/test-crosslink-popover.js`  
Expected: PASS.

- [ ] **Step 4: Commit changes**

```bash
git add public/index.html public/css/styles.css public/js/app.js scratch/test-crosslink-popover.js
git commit -m "feat: add @ cross-link auto-complete tooltip in article editor"
```

---

### Task 3: Visual Token Capacity Gauge in Weave Matrix

**Files:**
- Modify: `public/index.html:230-245`
- Modify: `public/css/styles.css`
- Modify: `public/js/context-builder.js`
- Create: `scratch/test-token-gauge.js`

**Interfaces:**
- Consumes: Active slate articles token estimate
- Produces: Color-coded visual token capacity bar `#token-budget-bar`

- [ ] **Step 1: Write test harness**

Create `scratch/test-token-gauge.js` asserting `#token-budget-bar` DOM presence and CSS progress styling.

- [ ] **Step 2: Implement HTML, CSS, and JS logic**

Add `#token-budget-bar` container in `index.html`.
Add progress bar styles and color tier rules in `styles.css`.
Update `renderTray()` in `context-builder.js` to calculate percentage and render token bar.

- [ ] **Step 3: Run test script to verify pass**

Run: `node scratch/test-token-gauge.js`  
Expected: PASS.

- [ ] **Step 4: Commit changes**

```bash
git add public/index.html public/css/styles.css public/js/context-builder.js scratch/test-token-gauge.js
git commit -m "feat: add visual token capacity gauge in Weave Matrix"
```

---

### Task 4: Interactive Knowledge Graph Node Filters

**Files:**
- Modify: `public/index.html:360-375`
- Modify: `public/css/styles.css`
- Modify: `public/js/graph-view.js`
- Create: `scratch/test-graph-filters.js`

**Interfaces:**
- Consumes: Graph category chip selection
- Produces: Filtered node network on graph canvas

- [ ] **Step 1: Write test harness**

Create `scratch/test-graph-filters.js` asserting `#graph-category-filters` container and filter method.

- [ ] **Step 2: Implement HTML, CSS, and JS logic**

Add `#graph-category-filters` container in `index.html`.
Add CSS filter chip styles in `styles.css`.
Implement category node filtering in `graph-view.js`.

- [ ] **Step 3: Run test script to verify pass**

Run: `node scratch/test-graph-filters.js`  
Expected: PASS.

- [ ] **Step 4: Commit changes**

```bash
git add public/index.html public/css/styles.css public/js/graph-view.js scratch/test-graph-filters.js
git commit -m "feat: add interactive category node filters to Knowledge Graph"
```

---

### Task 5: `+ Add to Scene Slate` Reader Action Button

**Files:**
- Modify: `public/index.html:130-145`
- Modify: `public/css/styles.css`
- Modify: `public/js/app.js`
- Create: `scratch/test-add-to-slate.js`

**Interfaces:**
- Consumes: Current viewing article object
- Produces: Article added to active context slate + visual toast notification

- [ ] **Step 1: Write test harness**

Create `scratch/test-add-to-slate.js` asserting button presence, slate push method, and toast notification element.

- [ ] **Step 2: Implement HTML, CSS, and JS logic**

Add `#btn-add-to-slate` in article viewer action bar in `index.html`.
Add toast notification container `#toast-container` and CSS animation in `styles.css`.
Implement `addCurrentArticleToSlate()` and `showToast()` in `app.js`.

- [ ] **Step 3: Run test script to verify pass**

Run: `node scratch/test-add-to-slate.js`  
Expected: PASS.

- [ ] **Step 4: Commit changes**

```bash
git add public/index.html public/css/styles.css public/js/app.js scratch/test-add-to-slate.js
git commit -m "feat: add + Add to Scene Slate action button and toast notification system"
```
