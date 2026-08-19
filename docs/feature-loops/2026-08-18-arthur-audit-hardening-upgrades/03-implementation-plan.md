# Stage 3: Implementation & Execution Plan

**Feature Title**: Arthur Audit Hardening & Technical Upgrades Sprint
**Date**: 2026-08-18
**Mode**: Autonomous Fast-Track (`--auto`)

---

## 📋 Actionable Execution Plan

### Step 1: Update `saveArticleWithDiskSync` & AI Fallback Budget in `server.js`
- Convert `saveArticleWithDiskSync` to use `fs.promises.writeFile` and `storage/${id}.md`.
- Enforce 10s top-level timeout budget in `callGeminiApiWithFallback`.

### Step 2: Add Global Keyboard Shortcut Dispatcher in `public/js/app.js`
- Implement `setupGlobalKeyboardShortcuts()` in `app.js` handling `Ctrl+Shift+F`, `Ctrl+Shift+M`, `Ctrl+Shift+K`.

### Step 3: Implement `destroy()` Cleanup in `public/js/atlas-view.js` & `app.js`
- Add `destroy()` on `AtlasView` to clean up Leaflet map instance and DOM listeners.
- Call `.destroy()` in `notifyWorldChange()`.

### Step 4: Verify Syntax & Integration
- Run `node --check server.js` and client JS syntax checks.
- Run `npm test` automated integration suite.

---

## 🎯 Stage 3 Gate 2 Auto-Pass
**Arthur's Verdict**: PASSED (Auto-Approved for Stage 4 Execution).
