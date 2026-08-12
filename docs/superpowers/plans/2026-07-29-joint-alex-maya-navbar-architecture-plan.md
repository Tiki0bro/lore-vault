# Joint Alex & Maya Header Architecture Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Re-architect header navigation into 3 strictly isolated flex zones, replace JS badge fallbacks with static nav icons, and set search bar width to 260px.

**Architecture:** Update `public/index.html` header structure and `public/css/styles.css` authoritative CSS rules.

**Tech Stack:** Vanilla HTML5, Pure CSS3.

---

### Task 1: Clean HTML Header Structure & Static Icons

**Files:**
- Modify: `public/index.html`

**Interfaces:**
- Consumes: Header navbar elements.
- Produces: Clean HTML structure with static inline nav tab icons (`📚`, `🎬`, `⚡`) and compact search container `<kbd>Ctrl K</kbd>`.

- [ ] **Step 1: Update `index.html` header structure**
Ensure `.navbar-zone-left`, `.navbar-zone-center`, and `.navbar-zone-right` wrap header elements cleanly. Use static `<span class="tab-icon">` elements.

- [ ] **Step 2: Commit**
`git add public/index.html`
`git commit -m "fix(ui): update index.html header structure with clean static tab icons"`


### Task 2: Authoritative Header CSS & Zone Isolation

**Files:**
- Modify: `public/css/styles.css`

**Interfaces:**
- Consumes: Header navbar CSS selectors.
- Produces: Authoritative CSS rules for `.navbar`, `.navbar-zone-left`, `.navbar-zone-center`, `.navbar-zone-right`, `.search-bar-container`, and `@media (max-width: 1400px)`.

- [ ] **Step 1: Add authoritative header CSS block to `styles.css`**
Set `.search-bar-container` to `width: 260px !important; min-width: 200px !important; max-width: 280px !important;`. Add `padding-right: 70px !important;` on `#global-search`. Set `.navbar-zone-center` to `margin: 0 auto !important; flex: 0 0 auto !important;`. Add responsive subtext hiding.

- [ ] **Step 2: Verification & Commit**
Verify CSS syntax and commit changes.
`git add public/css/styles.css`
`git commit -m "fix(ui): enforce authoritative flex zone isolation and 260px search bar layout"`
