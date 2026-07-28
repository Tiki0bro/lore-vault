# Maya Lin UI/UX Layout Redesign & Zero-Overflow Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Eliminate header button clipping, resolve vertical tag clutter, encapsulate article reader actions, and enforce a strict Zero-Overflow responsive layout contract across all viewports.

**Architecture:** Restructure `public/index.html` navbar header into 3 clean zones with a consolidated `⚙️ Tools ▾` dropdown. Add collapsible tag accordion in left sidebar. Add `.article-viewer-toolbar` header for reader controls. Update `styles.css` with responsive flex rules and media queries.

**Tech Stack:** Vanilla HTML5, Pure CSS3, Vanilla JavaScript.

## Global Constraints
- Pure CSS & Vanilla JavaScript.
- Zero horizontal screen clipping across 1024px to 4K resolutions.

---

### Task 1: Header Navbar Restructuring & Consolidated Tools Dropdown

**Files:**
- Modify: `public/index.html`
- Modify: `public/js/app.js`
- Modify: `public/css/styles.css`

**Interfaces:**
- Consumes: Navbar actions (`World Doctor`, `Media Vault`, `Ask AI`, `AI Settings`, `Import World`).
- Produces: Streamlined navbar with `⚙️ Tools ▾` dropdown container and zero button overflow.

- [ ] **Step 1: Restructure navbar header in `index.html`**
Group navbar into Brand, Core View Switcher, World & Theme Menu, Tools Dropdown (`#tools-dropdown-menu`), and `+ New Article` button.

- [ ] **Step 2: Add `toggleToolsMenu()` and `closeToolsMenu()` in `app.js`**
Add toggle logic and click-outside handler to close the dropdown menu smoothly.

- [ ] **Step 3: Add CSS for `tools-dropdown-container` and `dropdown-menu` in `styles.css`**
Style gold filigree dropdown container, hover states, and smooth slide-down transition.

- [ ] **Step 4: Commit**
`git add public/index.html public/js/app.js public/css/styles.css`
`git commit -m "feat(ui): restructure navbar header into 3 zones with consolidated tools dropdown"`


### Task 2: Left Sidebar Tags Accordion & Category Layout

**Files:**
- Modify: `public/index.html`
- Modify: `public/js/app.js`
- Modify: `public/css/styles.css`

**Interfaces:**
- Consumes: `#tag-cloud` element.
- Produces: Collapsible `🏷️ Tags` accordion header keeping category list visible without scrolling.

- [x] **Step 1: Update sidebar tags section in `index.html`**
Wrap `#tag-cloud` in a collapsible accordion container `#tags-accordion-body` with toggle button `#tags-accordion-toggle`.

- [x] **Step 2: Add `toggleTagsAccordion()` in `app.js`**
Toggle `.hidden` or max-height transition on `#tags-accordion-body`.

- [x] **Step 3: Commit**
`git add public/index.html public/js/app.js public/css/styles.css`
`git commit -m "feat(ui): implement collapsible sidebar tags accordion"`


### Task 3: Encapsulated Parchment Article Reader Toolbar

**Files:**
- Modify: `public/index.html`
- Modify: `public/css/styles.css`

**Interfaces:**
- Consumes: Article reader header controls (`Move to World...`, `Edit`, `Delete`).
- Produces: Encapsulated filigree-bordered toolbar header at the top right of the article reading pane.

- [x] **Step 1: Update article reader header markup in `index.html`**
Encapsulate controls in `.article-viewer-toolbar` with clean icon buttons.

- [x] **Step 2: Add CSS rules for `.article-viewer-toolbar` in `styles.css`**
Style filigree border frame, gold hover states, and flex alignment.

- [x] **Step 3: Commit**
`git add public/index.html public/css/styles.css`
`git commit -m "style(ui): encapsulate article reader controls in styled parchment toolbar"`


### Task 4: Responsive Media Queries & Zero-Overflow Layout Contract

**Files:**
- Modify: `public/css/styles.css`

**Interfaces:**
- Consumes: Layout container flex definitions.
- Produces: `overflow-x: hidden` enforcement and responsive media queries for 1024px, 1280px, 1440px, and 1920px+ viewports.

- [x] **Step 1: Add `overflow-x: hidden` and max-width constraints to `styles.css`**
Set `max-width: 100vw; overflow-x: hidden;` on body and app containers.

- [x] **Step 2: Add responsive media queries in `styles.css`**
Add `@media (max-width: 1400px)`, `@media (max-width: 1100px)`, and `@media (max-width: 900px)` rules to auto-collapse search inputs and sidebar margins.

- [x] **Step 3: Verification & Smoke Test**
Verify header navbar and layout across all resolutions to confirm zero screen clipping.

- [x] **Step 4: Commit**
`git add public/css/styles.css`
`git commit -m "style(ui): enforce zero-overflow layout contract and responsive media queries"`
