# Category UX & Intuitive Navigation Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace clunky HTML `<select>` dropdowns and vertical category sidebar scrolling with an intuitive Visual Category Dock Bar, Segmented Control Buttons, Contextual Sub-Category Bar, and Omni-Search category badges.

**Architecture:** Vanilla JS (`app.js`, `badges.js`) manages component rendering, state tracking (`navigationState`), and filter delegation. CSS flexbox/grid layout (`styles.css`) provides theme-aware styling and smooth slide animations.

**Tech Stack:** JavaScript (ES6+), HTML5, Vanilla CSS tokens.

## Global Constraints

- **Single-Responsibility & Modular Units**: Keep functions focused and files under ~200 lines where possible.
- **Zero Layout Overflow**: Use `overflow-x: auto` with scroll snapping to prevent element clipping on any display size.
- **Theme Parity**: Support `ancient-codex` (Gold Filigree), `scifi-fantasy` (Aether Cyan), and Parchment Light mode.
- **Empirical Verification**: Run test scripts and confirm green output before declaring tasks complete.

---

### Task 1: Visual Category Dock Bar Component

**Files:**
- Modify: `public/index.html:85-110`
- Modify: `public/css/styles.css:400-480`
- Modify: `public/js/app.js:1550-1600`
- Create: `scratch/test-category-dock.js`

**Interfaces:**
- Consumes: Articles array from API
- Produces: Visual category dock `#category-dock-bar` with icons and live article count badges

- [ ] **Step 1: Write component test script**

```javascript
// scratch/test-category-dock.js
const fs = require('fs');
const assert = require('assert');

console.log('Testing Category Dock DOM & CSS structure...');
const html = fs.readFileSync('public/index.html', 'utf8');
const css = fs.readFileSync('public/css/styles.css', 'utf8');

assert.ok(html.includes('id="category-dock-bar"'), 'HTML must contain #category-dock-bar');
assert.ok(css.includes('.category-dock-bar'), 'CSS must style .category-dock-bar');
assert.ok(css.includes('.category-dock-pill'), 'CSS must style .category-dock-pill');

console.log('✅ Category Dock component structure verified!');
```

- [ ] **Step 2: Run test to verify failure**

Run: `node scratch/test-category-dock.js`  
Expected: Fail on missing `#category-dock-bar`.

- [ ] **Step 3: Update `public/index.html`, `public/css/styles.css`, and `public/js/app.js`**

Add `#category-dock-bar` to `index.html` above `.articles-layout`.
Add CSS styles for `.category-dock-bar` and `.category-dock-pill` in `styles.css`.
Implement `renderCategoryDock()` in `app.js`.

- [ ] **Step 4: Run test to verify pass**

Run: `node scratch/test-category-dock.js`  
Expected: PASS with "✅ Category Dock component structure verified!"

- [ ] **Step 5: Commit changes**

```bash
git add public/index.html public/css/styles.css public/js/app.js scratch/test-category-dock.js
git commit -m "feat: add visual category dock bar with live article count badges"
```

---

### Task 2: Segmented Control Buttons (Replacing Native Dropdowns)

**Files:**
- Modify: `public/index.html:115-125`, `public/index.html:755-765`
- Modify: `public/css/styles.css`
- Modify: `public/js/app.js`

**Interfaces:**
- Consumes: Form inputs & sort selection triggers
- Produces: Custom segmented button controls `.segmented-control` replacing native browser dropdowns

- [ ] **Step 1: Implement segmented control HTML & CSS**

Replace native dropdowns with custom segmented button controls in `index.html` and style in `styles.css`.

- [ ] **Step 2: Attach event delegation in `app.js`**

Implement click handlers to update state seamlessly upon clicking segmented button pills.

- [ ] **Step 3: Verify form functionality**

Run local server and verify sorting and category creation forms function cleanly.

- [ ] **Step 4: Commit changes**

```bash
git add public/index.html public/css/styles.css public/js/app.js
git commit -m "feat: replace native dropdowns with custom segmented control buttons"
```

---

### Task 3: Contextual Sub-Category Bar & 1-Click Clear Filter

**Files:**
- Modify: `public/index.html`
- Modify: `public/css/styles.css`
- Modify: `public/js/app.js`

**Interfaces:**
- Consumes: `selectedCategory` state
- Produces: Slide-in sub-category bar `#sub-category-bar` with item count chips and `[✕ Clear Filter]` button

- [ ] **Step 1: Add `#sub-category-bar` container in `index.html`**

Place `#sub-category-bar` directly beneath `#category-dock-bar`.

- [ ] **Step 2: Add CSS rules & slide animation in `styles.css`**

Add CSS rules for `.sub-category-bar`, `.sub-chip-count`, and `.clear-filter-chip`.

- [ ] **Step 3: Implement `renderSubCategoryBar()` in `app.js`**

Render sub-category chips with live counts and attach 1-click clear filter handler.

- [ ] **Step 4: Verify interactive sub-category filtering**

Ensure clicking sub-categories or clearing filters updates article grid immediately.

- [ ] **Step 5: Commit changes**

```bash
git add public/index.html public/css/styles.css public/js/app.js
git commit -m "feat: add contextual sub-category bar with live counts and clear filter pill"
```

---

### Task 4: Omni-Search Badge Previews & E2E Verification

**Files:**
- Modify: `public/js/app.js`
- Create: `scratch/test-category-ux.js`

**Interfaces:**
- Consumes: Global search query input
- Produces: Search result previews with inline category badges (`[Races & Species]`, `[Location]`)

- [ ] **Step 1: Update search results rendering in `app.js`**

Include `LoreBadges.getCategoryIcon(art.category)` and badge pills beside title matches in `renderSearchResults()`.

- [ ] **Step 2: Create E2E component test `scratch/test-category-ux.js`**

Verify all UX redesign components pass 100% green without errors.

- [ ] **Step 3: Run E2E test script**

Run: `node scratch/test-category-ux.js`  
Expected: PASS with "✅ All Category UX Redesign tests passed!"

- [ ] **Step 4: Commit changes**

```bash
git add public/js/app.js scratch/test-category-ux.js
git commit -m "feat: add category badges to omni-search and complete E2E UX verification"
```
