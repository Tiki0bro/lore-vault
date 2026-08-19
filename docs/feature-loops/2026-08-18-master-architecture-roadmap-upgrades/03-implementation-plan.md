# Stage 3: Implementation & Execution Plan

**Feature Title**: Master Architecture Roadmap & System Decoupling Sprint
**Date**: 2026-08-18
**Mode**: Autonomous Fast-Track (`--auto`)

---

## 📋 Actionable Execution Plan

### Step 1: Create `public/js/event-bus.js` & Include in `public/index.html`
- Create `LoreEvents` Pub/Sub engine in `public/js/event-bus.js`.
- Add `<script src="js/event-bus.js"></script>` in `index.html`.

### Step 2: Refactor `notifyWorldChange` to Use `LoreEvents` in `public/js/app.js`
- Emit `LoreEvents.emit('world:changed', { worldId })` when switching worlds.
- Register `LoreEvents.on('world:changed')` in `AtlasView`, `TimelineView`, `FrontpageView`, and `RelationshipView`.

### Step 3: Implement `cleanOrphanedCrossLinks` & World Bundle Export Endpoint in `server.js`
- Add `cleanOrphanedCrossLinks` helper in `server.js` called on article deletion.
- Add `POST /api/export/world-bundle/:worldId` REST endpoint for offline bundle exports.

### Step 4: Verify Syntax & Test Suite Execution
- Run `node --check server.js` and client JS checks.
- Expand and run `npm test` integration suite.

---

## 🎯 Stage 3 Gate 2 Auto-Pass
**Arthur's Verdict**: PASSED (Auto-Approved for Stage 4 Execution).
