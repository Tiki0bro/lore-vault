# Stage 3: Implementation & Execution Plan

**Feature Title**: Usability & User Journey Friction Reduction Sprint
**Date**: 2026-08-20
**Mode**: Autonomous Fast-Track (`--auto`)

---

## 📋 Actionable Execution Plan

### Step 1: Update `public/index.html`
- Add `📋 Copy MD` and `🔗 Share Link` buttons to `.article-viewer-toolbar`.

### Step 2: Implement Toolbar Copy Actions & World Autofocus in `public/js/app.js`
- Update `openCreateArticleModal()` to pre-select active `currentWorldId` and focus Title.
- Implement `copyCurrentArticleMarkdown()` and `copyCurrentArticleShareLink()`.
- Add `clearAllFilters()` logic.

### Step 3: Verify Syntax & Integration
- Run `node --check server.js` and `npm test`.

---

## 🎯 Stage 3 Gate 2 Auto-Pass
**Arthur's Verdict**: PASSED (Auto-Approved for Stage 4 Execution).
