# Stage 2: Design Specification & Architecture

**Feature Title**: Navigation Quality of Life, Command Palette & History Stack
**Date**: 2026-08-20
**Mode**: Autonomous Fast-Track (`--auto`)

---

## 1. Technical Architecture & Component Upgrades

### Fix 1: Navigation History Stack & `↩ Back` Toolbar Breadcrumb
- In `public/js/app.js`:
  - Add `this.navigationHistory = []` and `this.historyIndex = -1`.
  - In `loadArticle(id, isHistoryNav = false)`, push `id` into `navigationHistory` when `isHistoryNav` is false.
  - Implement `navigateHistoryBack()` and `syncHistoryButtons()`.
- In `public/index.html`:
  - Add `#article-back-btn` (`<button class="btn btn-secondary toolbar-btn" id="article-back-btn" onclick="window.app.navigateHistoryBack()" disabled>↩ Back</button>`).

### Fix 2: Universal Command Palette Modal (`Ctrl + K` / `Cmd + K`)
- In `public/index.html`:
  - Add `#command-palette-modal` overlay with `#cmd-palette-input` and `#cmd-palette-results`.
- In `public/js/app.js`:
  - Add `toggleCommandPalette()`, `updateCommandPaletteResults(query)`, and handle keyboard navigation (`ArrowUp`/`ArrowDown`/`Enter`/`Escape`).

### Fix 3: Recent Articles Quick-Jump Dock
- In `public/js/app.js`:
  - Maintain `this.recentArticles = []` (max 5 items).
  - Implement `renderRecentArticlesDock()` rendering chips inside `#recent-articles-dock` in `public/index.html`.

### Fix 4: Global `Escape` Key Listener & Drawer Dismissal
- In `public/js/app.js`:
  - Bind `Escape` key in global `keydown` event listener to close `#command-palette-modal`, `#ai-chat-drawer`, `#weave-matrix-drawer`, and active modals.

---

## 2. Arthur's Design Interrogation & Gate 1 Auto-Pass

> **Arthur**: *"Does pushing every article view into `navigationHistory` create duplicate history entries when a user re-clicks the same article?"*
> 
> **Alex (Dev)**: *"No. `loadArticle` checks `if (this.navigationHistory[this.historyIndex] === id) return;`, preventing duplicate contiguous entries."*

**Arthur's Verdict**: PASSED (Auto-Approved for Stage 3).
