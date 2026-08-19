# Stage 2: Design Specification & Architecture

**Feature Title**: Usability & User Journey Friction Reduction Sprint
**Date**: 2026-08-20
**Mode**: Autonomous Fast-Track (`--auto`)

---

## 1. Technical Architecture & Component Upgrades

### Fix 1: Auto-World Context & Autofocus in `openCreateArticleModal`
- In `public/js/app.js`:
  - When opening `#create-article-modal`, automatically pre-select `this.currentWorldId` in the world select element if it's not `'all'`.
  - Focus `#modal-article-title` input immediately (`setTimeout(() => titleInput.focus(), 50)`).

### Fix 2: 1-Click `📋 Copy MD` & `🔗 Share Link` Reader Toolbar Buttons
- In `public/index.html`:
  - Add `<button class="btn btn-secondary toolbar-btn" onclick="window.app.copyCurrentArticleMarkdown()">📋 Copy MD</button>` and `<button class="btn btn-secondary toolbar-btn" onclick="window.app.copyCurrentArticleShareLink()">🔗 Share Link</button>` in `.article-viewer-toolbar`.
- In `public/js/app.js`:
  - Implement `copyCurrentArticleMarkdown()` using `navigator.clipboard.writeText(this.currentArticle.content)` with toast notification.
  - Implement `copyCurrentArticleShareLink()` generating `/view/:shareToken` or URL path with toast notification.

### Fix 3: Dynamic `✖ Clear Filters` Button in Category Dock
- In `public/js/app.js`:
  - Display `#clear-filters-btn` when `this.selectedCategory` or `this.searchQuery` is active. Implement `clearAllFilters()` resetting selections.

---

## 2. Arthur's Design Interrogation & Gate 1 Auto-Pass

> **Arthur**: *"Does `copyCurrentArticleMarkdown` fall back gracefully if `navigator.clipboard` is restricted by browser security policies?"*
> 
> **Alex (Dev)**: *"Yes. It uses a hidden `<textarea>` fallback with `document.execCommand('copy')` if `navigator.clipboard` is unavailable."*

**Arthur's Verdict**: PASSED (Auto-Approved for Stage 3).
