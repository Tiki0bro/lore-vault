# Stage 2: Design Spec & Gap Remediation Loop
**Feature**: World Atlas v4 Master Suite: Sub-Map Teleportation, Spatial Minimap Radar & Category Legend, Animated Party Travel Token
**Date**: 2026-08-20
**Feature Loop Directory**: `docs/feature-loops/2026-08-20-world-atlas-v4-master-suite/`

---

## 🛠️ Technical Design Specification

### 1. Sub-Map Teleportation & Battlemap Drill-Down (`public/js/atlas-view.js`)
- **Pin Detail Drawer Actions**:
  - If `pin.target_sub_map_id` exists: Render primary button `[🗺️ Teleport to Sub-Map]` inside `#atlas-drawer-actions`.
  - Clicking teleport button invokes `this.selectMap(pin.target_sub_map_id)`.
  - Add `[⚔️ Generate Battlemap]` button inside pin drawer:
    - Pre-populates `#gen-map-title` with `${pin.label} Battlemap`.
    - Auto-selects `⚔️ Battlemap` scope and checks target article.
    - Opens `#atlas-generate-modal`.

### 2. Glassmorphic Spatial Minimap Radar & Category Legend (`public/js/atlas-view.js` & `public/css/styles.css`)
- **Spatial Minimap Radar `#atlas-minimap`**:
  - Positioned in bottom-right corner of map viewport.
  - Contains thumbnail map image `<img id="minimap-img">` and interactive viewport rectangle `<div id="minimap-viewport-rect">`.
  - Synced with Leaflet `move`, `zoom`, and `resize` events: updates rect position and dimensions relative to map bounds.
  - Clicking anywhere on minimap calculates click percentage `(pctX, pctY)` and calls `mapInstance.panTo([pctY * height, pctX * width])`.
  - Add toggle button `🗺️ Minimap` in toolbar to show/hide minimap.
- **Category Legend Panel `#atlas-legend-panel`**:
  - Glassmorphic floating drawer in bottom-left corner.
  - Renders legend items for all 8 categories (Settlements, Fortresses, Dungeons, Natural Wonders, Quests, Factions, Relics, Uncategorized) with color badges, icon symbols, and live pin counts.
  - Clicking a category legend item toggles category visibility on canvas!

### 3. Animated Party Travel Token & Encounter Simulator (`public/js/atlas-view.js` & `public/css/styles.css`)
- **Party Travel Token Animation (`animateRouteExpedition(route)`)**:
  - Instantiates party marker `L.marker` with animated boot/horse icon (`⛵` or `🐎` or `🥾`).
  - Animates along `route.points` polylines using `requestAnimationFrame`.
  - Shows floating toast `#atlas-travel-toast` displaying live travel distance (miles/km), mode (Foot/Horse/Sail), elapsed days, and random encounter check alerts (`🎲 Day X: D20 Random Encounter Check!`).
  - Add `[▶️ Travel Route]` button inside route detail drawer and route context menu.

---

## 🔍 Arthur's Line-by-Line Spec Interrogation

- **Arthur**: *"Maya, will the minimap interfere with Leaflet controls or touch screens?"*
- **Maya**: *"No. The minimap has `pointer-events: auto` for click-to-pan while allowing map pan gestures to pass through outside its container."*
- **Arthur**: *"Alex, how does the travel animation handle routes with 50+ vertices?"*
- **Alex**: *"We compute total polyline distance, normalize step progress `t` between 0.0 and 1.0, and interpolate segment points smoothly at 60fps."*
- **Arthur**: *"Riley, what if a pin's `target_sub_map_id` references a deleted map?"*
- **Riley**: *"We check `this.maps.some(m => m.id === pin.target_sub_map_id)`. If missing, we render a clean warning toast and offer to re-link."*

---

**Gate 1 Verdict**: APPROVED BY ARTHUR VANCE & TEAM. Proceeding to Stage 3 (Implementation Plan).
