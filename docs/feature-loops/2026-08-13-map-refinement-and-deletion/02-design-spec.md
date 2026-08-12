# Feature Loop Stage 2: Design Spec & Gap Remediation
**Feature**: Map Deletion, Targeted Article Context Generator, & Hand-Drawn Procedural Cartography Polish
**Date**: 2026-08-13
**Mode**: Autonomous Fast-Track (--auto)
**Status**: Stage 2 Design Spec Approved (Arthur Socratic Pass)

---

## 1. Map Deletion REST API & UI Toolbar Button

### 1.1 Express Endpoint `DELETE /api/maps/:mapId`
- Endpoint: `DELETE /api/maps/:mapId`
- Behavior:
  1. Queries map record to get `image_path`.
  2. Deletes dependent rows in `map_pins`, `map_territories`, `map_layers`, and `map_routes`.
  3. Deletes parent row in `maps`.
  4. Unlinks map image file from disk if located in `public/uploads/images/` and not referenced by another map.
  5. Returns `{ success: true, message: 'Map deleted successfully' }`.

### 1.2 Toolbar UI `[🗑️ Delete Map]`
- Added `[🗑️ Delete Map]` button (`#atlas-delete-map-btn`) in `.atlas-toolbar-left` next to map select dropdown.
- Displays browser confirm modal (*"Are you sure you want to delete '[Map Title]'? This action cannot be undone."*).
- On confirmation: sends `DELETE /api/maps/${mapId}`, re-fetches maps catalog, and auto-selects remaining map or default view.

---

## 2. Targeted Article Lore Selector in Generator Modal (`#atlas-generate-modal`)

- Added searchable multi-select article checklist container `#gen-article-selector`:
  - Fetches articles from `/api/articles`.
  - Filters by category (`Settlements`, `Fortresses`, `Dungeons`, `Natural Wonders`, `Quests`, `Factions`, `Relics`).
  - DMs can search and check specific articles to include in generation.
- **AI Prompt Construction**: If AI engine selected, constructs prompt using **only** checked articles:
  - Prompt: *"High resolution fantasy cartography map of [WorldName] featuring region [Article1 Title]: [Article1 Summary], [Article2 Title]: [Article2 Summary], parchment style, intricate hand-drawn coastlines, mountain ranges, no text labels."*
- **Pin Placement**: Pin scattering only places pins for checked articles instead of flooding map with 20+ random pins.

---

## 3. Hand-Drawn Procedural Canvas Overhaul (`public/js/perlin-cartography.js`)

- **Paper Grain & Vignette Shader**: Renders subtle noise paper grain and dark vignette radial gradient on parchment canvas.
- **Coastline Ink Ripples & Stippling**: Draws 4 concentric hand-inked ocean contour lines with stipple dot fills (`:::`) along beaches.
- **Mountain Peak Vector Stamps (`▲`)**: Replaces flat brown elevation blobs with hand-drawn mountain triangle peak icons stamped along high elevation ridges.
- **Forest & Tree Cluster Stamps (`🌲`)**: Renders small pine/deciduous tree cluster stamps on lowland biomes.
- **Procedural River Carving**: Simulates 2–4 river paths originating at mountain peaks and tracing down elevation gradients into ocean bodies.
- **Compass Rose & Frame**: Renders intricate compass rose in ocean corner and ornate double-stroke border frame.
