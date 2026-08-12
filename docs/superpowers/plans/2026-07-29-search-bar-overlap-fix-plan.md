# Search Bar & Navbar Overlap Fix Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix search input text colliding with `<kbd>Ctrl K</kbd>` badge/toggle and protect `.nav-tabs` (`Lore Codex`, `Narrative Slate`, `Weave Matrix`) from flex compression.

**Architecture:** Update `public/index.html` search action container structure and `public/css/styles.css` padding and flex-shrink rules.

**Tech Stack:** Vanilla HTML5, Pure CSS3.

---

### Task 1: Inner Search Padding & Navbar Flex Protection

**Files:**
- Modify: `public/index.html`
- Modify: `public/css/styles.css`

**Interfaces:**
- Consumes: `#search-container` and `.nav-tabs`.
- Produces: Overlap-free search input with `padding-right: 85px` and zero tab compression.

- [ ] **Step 1: Update `.search-bar-container` markup in `index.html`**
Wrap search badge, clear button, and toggle button inside `.search-actions-right`.

- [ ] **Step 2: Update CSS rules in `styles.css`**
Add `padding-right: 85px !important` on `#global-search` input. Set `width: 300px` on `.search-bar-container`. Add `flex-shrink: 0 !important` on `.nav-tabs` and `.navbar-zone-center`.

- [ ] **Step 3: Verification & Commit**
Verify CSS and HTML markup and commit changes.
`git add public/index.html public/css/styles.css`
`git commit -m "fix(ui): fix search bar inner text overlap and protect nav tabs flex shrink"`
