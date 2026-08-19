# Stage 2: Design Specification & Architecture

**Feature Title**: Architectural Consistency & Logic Conflict Remediation
**Date**: 2026-08-18
**Mode**: Autonomous Fast-Track (`--auto`)

---

## 1. Technical Architecture & Structural Fixes

### Fix A: Central World State Propagation (`notifyWorldChange`)
- In `public/js/app.js`:
  - Enhance `switchWorld(worldId)` to invoke `notifyWorldChange(worldId)`.
  - `notifyWorldChange(worldId)` checks all view singletons:
    - If `window.atlasView`: updates `window.atlasView.worldId = worldId`, resets map instance, and calls `window.atlasView.init()`.
    - If `window.timelineView`: updates `window.timelineView.worldId = worldId` and calls `window.timelineView.init()`.
    - If `window.frontpageView`: updates `window.frontpageView.worldId = worldId` and calls `window.frontpageView.init()`.
    - If `window.relationshipView`: calls `window.relationshipView.init(worldId)`.

### Fix B: Standardized Tab Switch Lifecycle (`switchTab`)
- In `public/js/app.js`:
  - Standardize `switchTab(tabName)` so every view module receives `this.currentWorldId` on tab activation.
  - Ensures tab switches always display fresh lore for the active world.

### Fix C: Backend AI Helper Consolidation in `server.js`
- Merge `callGeminiApi` and `callGeminiApiWithFallback` into a single helper:
  `async function callGeminiApiWithFallback(prompt, apiKey = '', requestedModel = 'gemini-flash-latest')`
- Standardizes candidate model retries (`gemini-flash-latest`, `gemini-2.0-flash`, `gemini-3.1-pro-preview`, `gemini-pro-latest`), API key resolution, and response parsing across all endpoints.

### Fix D: Integration Test Suite Expansion (`test/api-suite.js`)
- Add automated test assertions verifying:
  1. `GET /api/worlds/:worldId/frontpage`
  2. `GET /api/worlds/:worldId/timeline`
  3. `GET /api/worlds/:worldId/relationships`
  4. `GET /api/worlds/:worldId/maps`

---

## 2. Arthur's Design Interrogation & Gate 1 Auto-Pass

> **Arthur**: *"If a user is currently viewing the Atlas map canvas and switches world in the navbar dropdown, does the old Leaflet map instance get cleaned up properly?"*
> 
> **Alex (Dev)**: *"Yes. `AtlasView.init()` cleans up `this.mapInstance.remove()` before loading maps for the new world ID, preventing Leaflet container re-initialization errors (`Map container is already initialized`)."*

**Arthur's Verdict**: PASSED (Auto-Approved for Stage 3).
