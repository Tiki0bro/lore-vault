# Stage 2: Design Specification & Architecture

**Feature Title**: Arthur Audit Hardening & Technical Upgrades Sprint
**Date**: 2026-08-18
**Mode**: Autonomous Fast-Track (`--auto`)

---

## 1. Technical Architecture & Component Upgrades

### Fix 1: Collision-Proof Async Disk Sync (`saveArticleWithDiskSync`)
- In `server.js`:
  - Refactor `saveArticleWithDiskSync(db, articleData, isUpdate, callback)` to use `fs.promises.writeFile` and `fs.promises.unlink` asynchronously.
  - Store Markdown files under `storage/${id}.md` (where `id` is the immutable article ID slug), eliminating filename collisions between articles with similar titles.

### Fix 2: Global Keyboard Shortcut Event Listener
- In `public/js/app.js`:
  - Add `setupGlobalKeyboardShortcuts()` attached to `document.addEventListener('keydown', (e) => ...)`:
    - `Ctrl + Shift + F`: Toggles Zen Focus Reader Mode (`this.toggleZenMode()`).
    - `Ctrl + Shift + M`: Toggles Weave Matrix Drawer (`window.toggleWeaveMatrixDrawer()`).
    - `Ctrl + Shift + K`: Toggles Ask My World AI Assistant Drawer (`window.toggleAiChatDrawer()`).

### Fix 3: Bounded 10s AI Fallback Budget & Fast-Fail
- In `server.js`:
  - In `callGeminiApiWithFallback(prompt, apiKey, requestedModel)`, set a top-level `10000ms` overall timeout for candidate model attempts.
  - Limit retries to the top 3 models (`gemini-flash-latest`, `gemini-2.0-flash`, `gemini-1.5-flash`) before returning the offline fallback.

### Fix 4: Explicit View `destroy()` & Map Memory Cleanup
- In `public/js/atlas-view.js` and `public/js/timeline-view.js`:
  - Implement explicit `destroy()` methods:
    - `AtlasView.destroy()` calls `if (this.mapInstance) this.mapInstance.remove(); this.mapInstance = null;`.
  - In `app.js`, `notifyWorldChange(worldId)` invokes `.destroy()` on existing views before re-initialization.

---

## 2. Arthur's Design Interrogation & Gate 1 Auto-Pass

> **Arthur**: *"If `fs.promises.writeFile` fails asynchronously, does SQLite correctly reject the mutation?"*
> 
> **Alex (Dev)**: *"Yes. `saveArticleWithDiskSync` returns the async callback error immediately before executing `db.run()`, preserving total transaction safety."*

**Arthur's Verdict**: PASSED (Auto-Approved for Stage 3).
