# Stage 3: Implementation & Execution Plan

**Feature Title**: Architectural Consistency & Logic Conflict Remediation
**Date**: 2026-08-18
**Mode**: Autonomous Fast-Track (`--auto`)

---

## 📋 Actionable Implementation Steps

### Step 1: Add World State Change Notification (`notifyWorldChange`) in `public/js/app.js`
- Implement `notifyWorldChange(worldId)` in `app.js`.
- Invoke `notifyWorldChange(worldId)` inside `switchWorld(worldId)`.

### Step 2: Standardize View Lifecycle in `switchTab(tabName)` in `public/js/app.js`
- Update `switchTab` handling for `atlas`, `timeline`, `frontpage`, and `relationships` to ensure `currentWorldId` is always passed during tab activation.

### Step 3: Consolidate AI Fallback Helpers in `server.js`
- Merge `callGeminiApi` and `callGeminiApiWithFallback` into one authoritative `callGeminiApiWithFallback` helper.
- Update caller routes to use the unified function.

### Step 4: Expand Automated Integration Test Suite (`test/api-suite.js`)
- Add tests for world-specific endpoints (`/api/worlds/:worldId/frontpage`, `/api/worlds/:worldId/timeline`, `/api/worlds/:worldId/relationships`, `/api/worlds/:worldId/maps`).
- Run `npm test` and verify 100% green results.

---

## 🎯 Stage 3 Gate 2 Auto-Pass
**Arthur's Verdict**: PASSED (Auto-Approved for Stage 4 Execution).
