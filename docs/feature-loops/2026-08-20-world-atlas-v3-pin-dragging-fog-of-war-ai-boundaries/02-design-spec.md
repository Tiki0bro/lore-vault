# Stage 2: Design Spec & Gap Remediation Loop
**Feature**: World Atlas v3: Interactive Pin Dragging, Fog of War Discovery Canvas & AI Auto-Territory Tracing
**Date**: 2026-08-20
**Feature Loop Directory**: `docs/feature-loops/2026-08-20-world-atlas-v3-pin-dragging-fog-of-war-ai-boundaries/`

---

## 🛠️ Technical Design Specification

### 1. Interactive Pin Drag-and-Drop (`public/js/atlas-view.js` & `server.js`)
- **Leaflet Marker Dragging**:
  - Add `draggable: this.viewMode === 'dm'` option to Leaflet `L.marker()` creation.
  - Bind `dragend` listener to marker:
    - Calculates new `x_pct = newLatLng.lng / mapWidth` and `y_pct = (mapHeight - newLatLng.lat) / mapHeight`.
    - Issues `PUT /api/map-pins/:pinId` to update SQLite `map_pins` row coordinates.
    - Shows toast notification: `📌 Pin [Title] moved to (X%, Y%)`.
- **Drag vs Click Suppressor**:
  - Track `isDraggingPin = false`. Set `true` on `dragstart`, reset after 200ms on `dragend`.
  - In marker `click` listener: if `isDraggingPin` is true, return early without opening detail drawer.

### 2. Multi-Layer Fog of War Discovery Canvas (`public/js/atlas-view.js` & `server.js`)
- **HTML5 Overlay Canvas (`#atlas-fog-canvas`)**:
  - Overlay an HTML5 canvas element over Leaflet map container.
  - Synchronize canvas dimensions and transform matrix with Leaflet `zoomend`, `move`, and `viewreset` events.
- **DM Brush Tools**:
  - Toolbar button `🌫️ Fog Tool` opens floating glassmorphic brush control bar (`#atlas-fog-toolbar`):
    - `🧹 Reveal Brush` (Erases fog pixels under cursor).
    - `☁️ Obscure Brush` (Paints dark fog pixels).
    - `🎚️ DM Fog Opacity Slider` (0% transparent in DM View ➔ 100% opaque in Player View).
    - `✨ Reset / Reveal All Fog` buttons.
- **SQLite Persistence (`map_fog_states`)**:
  - `PUT /api/maps/:mapId/fog` saves base64 PNG data URL of fog mask.
  - `GET /api/maps/:mapId/fog` loads saved fog mask image onto overlay canvas.

### 3. AI Boundary Auto-Tracing & Territory Conversion (`server.js` & `public/js/atlas-view.js`)
- **REST Endpoint `POST /api/maps/:mapId/ai-auto-boundaries`**:
  - Analyzes map image contours to extract vector polygon rings representing kingdom borders and landmass coastlines.
  - Returns GeoJSON array of polygon coordinates: `[ { name: "Coastline Boundary", coordinates: [[x1, y1], [x2, y2], ...] } ]`.
- **UI Approval Drawer (`#atlas-ai-boundary-drawer`)**:
  - Renders ghost polygons (`.ai-ghost-polygon`) on Leaflet canvas.
  - DMs click `[✓ Approve & Convert to Layer Territory]` to insert as interactive `map_territories` vector polygons.

---

## 🔍 Arthur's Line-by-Line Spec Interrogation

- **Arthur**: *"Maya, how does the DM toggle between dragging pins and drawing boundaries?"*
- **Maya**: *"We have mutually exclusive mode buttons in the toolbar (`Drop Pin`, `Draw Boundary`, `Draw Route`, `Fog Tool`). Activating one deactivates the others."*
- **Arthur**: *"Alex, does Fog of War persist in exported standalone HTML bundles?"*
- **Alex**: *"Yes! `POST /api/export/atlas/:worldId` embeds the fog mask PNG data URL directly into the standalone HTML file, preserving player discovery states offline."*
- **Arthur**: *"Riley, what happens if SQLite doesn't have the `map_fog_states` table?"*
- **Riley**: *"We write an idempotent migration in `server.js` (`CREATE TABLE IF NOT EXISTS map_fog_states ...`) during startup."*

---

**Gate 1 Verdict**: APPROVED BY ARTHUR VANCE & TEAM. Proceeding to Stage 3 (Implementation Plan).
