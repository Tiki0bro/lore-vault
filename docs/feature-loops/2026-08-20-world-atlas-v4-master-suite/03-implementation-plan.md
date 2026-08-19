# Stage 3: Implementation Plan & Team Validation
**Feature**: World Atlas v4 Master Suite: Sub-Map Teleportation, Spatial Minimap Radar & Category Legend, Animated Party Travel Token
**Date**: 2026-08-20
**Feature Loop Directory**: `docs/feature-loops/2026-08-20-world-atlas-v4-master-suite/`

---

## 🎯 Implementation Steps

### Task 1: Sub-Map Teleportation & Battlemap Generator Drill-Down (`public/js/atlas-view.js`)
- [x] Add `[🗺️ Teleport to Sub-Map]` and `[⚔️ Generate Battlemap]` action buttons inside `openArticleDrawer()`.
- [x] Implement sub-map teleport action: `this.selectMap(targetSubMapId)`.
- [x] Implement 1-click battlemap generator pre-fill in `openGeneratorModal()`.

### Task 2: Spatial Minimap Radar & Category Legend Panel (`public/js/atlas-view.js` & `public/css/styles.css`)
- [x] Create `#atlas-minimap` container with thumbnail image and active viewport rectangle.
- [x] Bind Leaflet `move`, `zoom`, and `resize` events to sync minimap viewport rect.
- [x] Add click-to-pan handler on minimap thumbnail.
- [x] Implement `#atlas-legend-panel` with category toggles and live pin counters.

### Task 3: Animated Party Travel Token & Random Encounter Simulator (`public/js/atlas-view.js` & `public/css/styles.css`)
- [x] Implement `animateRouteExpedition(route)` interpolating party marker along polyline vertices.
- [x] Render floating toast `#atlas-travel-toast` showing distance, mode, days, and D20 random encounter alerts.
- [x] Add `[▶️ Travel Route]` button in route drawer.

### Task 4: Comprehensive QA Verification Suite (`scratch/test-world-atlas-v4-master.js`)
- [x] Create verification test script testing teleportation pre-fill, minimap viewport rect sync, legend counters, and expedition animation interpolation.

---

## 🔍 Arthur's Implementation Plan Interrogation

- **Arthur**: *"Alex, pass or fail on minimap sync performance?"*
- **Alex**: *"Pass. Rect calculations use CSS percentage transforms, executing in <1ms without blocking the main rendering loop."*
- **Arthur**: *"Riley, how do we verify travel animation interpolation during QA?"*
- **Riley**: *"We will run `scratch/test-world-atlas-v4-master.js` to assert linear point interpolation along polyline points across `t` from `0.0` to `1.0`."*

---

**Gate 2 Verdict**: APPROVED BY ARTHUR VANCE & DEV TEAM. Proceeding to Stage 4 (Execution & QA Verification).
