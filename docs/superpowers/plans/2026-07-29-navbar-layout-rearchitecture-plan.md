# Navbar Header Layout Re-Architecture Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permanently resolve header overlap between Search Bar and `Lore Codex` nav tab by isolating navbar zones, hiding brand subtext on `< 1400px`, and setting search bar width to `200px`.

**Architecture:** Update `public/index.html` header structure and `public/css/styles.css` flex properties.

**Tech Stack:** Vanilla HTML5, Pure CSS3.

---

### Task 1: Header Zone Isolation & Search Bar Width Fix

**Files:**
- Modify: `public/index.html`
- Modify: `public/css/styles.css`

**Interfaces:**
- Consumes: Navbar flex layout and header buttons.
- Produces: 3 isolated flex zones (`.navbar-zone-left`, `.navbar-zone-center`, `.navbar-zone-right`), responsive subtitle hiding, and 200px search bar.

- [ ] **Step 1: Update `index.html` header markup**
Clean up tab button icons (`📚`, `🎬`, `⚡`) and compact search badge `<kbd>Ctrl K</kbd>`.

- [ ] **Step 2: Update `styles.css` rules**
Set `.search-bar-container` to `width: 200px; flex: 0 0 auto;`.
Set `.navbar-zone-left` to `flex: 0 1 auto;`.
Set `.navbar-zone-center` to `flex: 0 0 auto; margin: 0 auto;`.
Set `.navbar-zone-right` to `flex: 0 0 auto;`.
Add `@media (max-width: 1400px) { .brand-text .subtext { display: none; } }`.

- [ ] **Step 3: Verification & Commit**
Verify CSS and HTML syntax and commit changes.
`git add public/index.html public/css/styles.css`
`git commit -m "fix(ui): re-architect navbar layout into 3 isolated flex zones to eliminate search overlap"`
