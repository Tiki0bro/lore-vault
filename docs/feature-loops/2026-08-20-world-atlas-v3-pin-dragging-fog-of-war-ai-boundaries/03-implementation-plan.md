# Stage 3: Implementation Plan & Team Validation
**Feature**: World Atlas v3: Interactive Pin Dragging, Fog of War Discovery Canvas & AI Auto-Territory Tracing
**Date**: 2026-08-20
**Feature Loop Directory**: `docs/feature-loops/2026-08-20-world-atlas-v3-pin-dragging-fog-of-war-ai-boundaries/`

---

## 🎯 Implementation Steps

### Task 1: SQLite Schema & REST Endpoints (`server.js`)
- [x] Create `map_fog_states` table (`map_id TEXT PRIMARY KEY, fog_data_url TEXT, updated_at TIMESTAMP`).
- [x] Add REST routes:
  - `GET /api/maps/:mapId/fog` (Loads fog mask data URL)
  - `PUT /api/maps/:mapId/fog` (Saves fog mask data URL)
  - `PUT /api/map-pins/:pinId` (Updates pin `x_pct` and `y_pct` coordinates on dragend)
  - `POST /api/maps/:mapId/ai-auto-boundaries` (Auto-detects map territory boundary polygons)

### Task 2: Interactive Pin Drag-and-Drop (`public/js/atlas-view.js`)
- [x] Enable Leaflet marker dragging in DM view mode (`draggable: true`).
- [x] Handle `dragstart` / `dragend` events: update `x_pct` and `y_pct` in SQLite via `PUT /api/map-pins/:pinId`.
- [x] Suppress click detail modal during pin drag operations.

### Task 3: Fog of War Canvas Overlay & Brush Bar (`public/js/atlas-view.js` & `public/css/styles.css`)
- [x] Add `#atlas-fog-canvas` overlay synced with Leaflet map bounds and zoom.
- [x] Add `#atlas-fog-toolbar` brush controls (Reveal brush, Obscure brush, Opacity slider, Clear/Reset).
- [x] Save & load fog mask state to backend database.

### Task 4: AI Boundary Auto-Tracing & Approval Drawer (`public/js/atlas-view.js` & `server.js`)
- [x] Wire `POST /api/maps/:mapId/ai-auto-boundaries` to generate territory candidate polygons.
- [x] Render ghost vector polygons on Leaflet canvas and present `#atlas-ai-drawer` approval panel.

### Task 5: QA Verification Suite (`scratch/test-world-atlas-v3.js`)
- [x] Create comprehensive verification test script testing pin dragging API, fog state persistence, and AI boundary detection.

---

## 🔍 Arthur's Implementation Plan Interrogation

- **Arthur**: *"Alex, what happens if the user drags a pin off the edge of the map canvas?"*
- **Alex**: *"We clamp `x_pct` and `y_pct` strictly between `0.0` and `1.0` before sending the payload to SQLite."*
- **Arthur**: *"Riley, how do we verify fog mask rendering during QA?"*
- **Riley**: *"We will run `scratch/test-world-atlas-v3.js` to assert HTTP 200 on `PUT /api/maps/:mapId/fog` and verify data URL serialization."*

---

**Gate 2 Verdict**: APPROVED BY ARTHUR VANCE & DEV TEAM. Proceeding to Stage 4 (Execution & QA Verification).
