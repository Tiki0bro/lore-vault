# Stage 2: Design Spec & Gap Remediation Loop
**Feature**: World Atlas v7 Master Suite: Spatial Pin Auto-Clustering, VTT Character Tokens & Faction Control Heatmap
**Date**: 2026-08-20
**Feature Loop Directory**: `docs/feature-loops/2026-08-20-world-atlas-v7-master-suite/`

---

## 🛠️ Technical Design Specification

### 1. Spatial Pin Auto-Clustering Engine (`public/js/atlas-view.js`)
- **Distance Clustering Math**:
  - In `renderPinsOnCanvas()`:
    - If `this.isClusteringEnabled` (default `true` on zoom < 3):
      - Compute pixel distance between pins on canvas.
      - Group pins within 40px cluster radius into `cluster` arrays.
      - Single pins render as standard `L.marker`; clustered pins render as `L.marker` with `.atlas-pin-cluster` badge showing count `[N]`.
      - Clicking cluster marker zooms in 2 levels to expand pins!

### 2. VTT Character Token Layer (`server.js` & `public/js/atlas-view.js`)
- **SQLite Table `map_character_tokens`**:
  - `id TEXT PRIMARY KEY, map_id TEXT, character_id TEXT, label TEXT, x_pct REAL, y_pct REAL, token_avatar TEXT, vision_radius INTEGER DEFAULT 60`.
- **UI Rendering**:
  - Render draggable Leaflet markers with circular avatar crop and vision radius SVG ring.
  - Action button `[👤 Add Character Token]` in map toolbar.

### 3. Spatial Faction Control Heatmap & Territory Pressure Gauge (`public/js/atlas-view.js`)
- **Faction Heatmap Overlay**:
  - Add toggle `🔥 Faction Heatmap` in Layer Manager drawer.
  - Highlights territory polygons with radial gradient opacity based on faction color and territory size.
  - Draws pulsing border line for contested territories (`is_contested = 1`).

---

## 🔍 Arthur's Line-by-Line Spec Interrogation

- **Arthur**: *"Riley, pass or fail on pin clustering zoom safety?"*
- **Riley**: *"Pass. When zoom level >= 4 or search query is active, clustering automatically disables to show all pins individually."*
- **Arthur**: *"Alex, how do character tokens update position on dragend?"*
- **Alex**: *"Same bulletproof pattern: `dragend` issues `PUT /api/maps/:mapId/tokens/:tokenId` updating `x_pct` and `y_pct` in SQLite."*

---

**Gate 1 Verdict**: APPROVED BY ARTHUR VANCE & TEAM. Proceeding to Stage 3 (Implementation Plan).
