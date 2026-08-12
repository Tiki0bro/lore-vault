# Pixel-Math Header Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permanently resolve top navbar overlap by paring Zone 3 down to 260px, setting Search Bar to 180px, and stripping `data-badge` attributes from header nav elements.

**Architecture:** Update `public/index.html` header structure and `public/css/styles.css` authoritative CSS rules.

**Tech Stack:** Vanilla HTML5, Pure CSS3.

---

### Task 1: HTML Streamlining & `data-badge` Icon Cleanup

**Files:**
- Modify: `public/index.html`

**Interfaces:**
- Consumes: Header HTML markup.
- Produces: Streamlined Zone 3 (`🌍 Primary World ▾`, `⚙️ Tools ▾`, `+ New Article`), Zone 1 (`📜 LoreVault` + 180px Search Bar), and nav tabs with static inline icons without `data-badge` attributes.

- [ ] **Step 1: Remove `+ World` and `* Theme` inline buttons from `.world-theme-container` in `index.html`**
Keep only `<select id="world-select-dropdown">` and `🌍` icon.

- [ ] **Step 2: Strip `data-badge` from header icons in `index.html`**
Replace `<div class="brand-icon" data-badge="scroll"...>` with `<div class="brand-icon">📜</div>`. Replace `<span class="search-icon" data-badge="search"...>` with `<span class="search-icon-static">🔍</span>`.

- [ ] **Step 3: Commit**
`git add public/index.html`
`git commit -m "fix(ui): streamline header HTML markup and remove data-badge hydration tags from top nav"`


### Task 2: Pixel-Budget CSS Rules & Zone Width Enforcement

**Files:**
- Modify: `public/css/styles.css`

**Interfaces:**
- Consumes: Header CSS selectors.
- Produces: Authoritative CSS rules setting Zone 1 (280px), Zone 3 (260px), and Search Bar (180px) with `@media (max-width: 1500px)`.

- [ ] **Step 1: Append pixel-budget CSS block to `styles.css`**
Set `.search-bar-container` to `width: 180px !important; max-width: 200px !important; flex: 0 0 auto !important;`. Set `.navbar-zone-left` to `flex: 0 0 auto !important;`. Set `.navbar-zone-center` to `flex: 0 0 auto !important; margin: 0 auto !important;`. Set `.navbar-zone-right` to `flex: 0 0 auto !important;`. Add `@media (max-width: 1500px) { .brand-text .subtext { display: none !important; } }`.

- [ ] **Step 2: Verification & Commit**
Verify CSS syntax and commit changes.
`git add public/css/styles.css`
`git commit -m "fix(ui): enforce pixel-budget CSS zone widths to eliminate header nav overlap"`
