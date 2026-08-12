# Remove Hovering Kbd Badge Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permanently remove `.search-kbd-badge` from `index.html` and `styles.css` to fix vertical overflow hovering artifact. Update input placeholder to `Search lore (Ctrl+K)...`.

**Architecture:** Update `public/index.html` and `public/css/styles.css`.

**Tech Stack:** Vanilla HTML5, Pure CSS3.

---

### Task 1: HTML Badge Removal & CSS Rule Cleanup

**Files:**
- Modify: `public/index.html`
- Modify: `public/css/styles.css`

**Interfaces:**
- Consumes: `#search-container` HTML and CSS rules.
- Produces: Clean search input with placeholder `Search lore (Ctrl+K)...` and zero hovering badge artifacts.

- [ ] **Step 1: Update `#search-container` in `index.html`**
Remove `.search-kbd-badge` and set placeholder to `Search lore (Ctrl+K)...`.

- [ ] **Step 2: Remove `.search-kbd-badge` CSS rules from `styles.css`**
Clean up `.search-kbd-badge` selectors and remove `padding-right: 70px` restriction on input text.

- [ ] **Step 3: Verification & Commit**
Verify HTML/CSS syntax and commit changes.
`git add public/index.html public/css/styles.css`
`git commit -m "fix(ui): remove hovering kbd badge and update search placeholder to Search lore (Ctrl+K)..."`
