# Design Specification: Dual-Engine Automated World Cartographer

**Document Version**: 1.0.0  
**Date**: 2026-08-10  
**Author**: Ethen (Product Owner) & Antigravity AI  
**Status**: Approved  
**Target Path**: `docs/superpowers/specs/2026-08-10-dual-engine-cartographer-design.md`

---

## 1. Executive Summary & Goal

LoreVault requires an automated map and pin generation system (**Dual-Engine World Cartographer**) capable of creating world maps and placing location pins directly from a world's `Locations` lore articles.

The system features two complementary engines:
1. **✨ AI Spatial Cartographer (Online Mode)**: Reads location lore via Gemini API, performs spatial directional analysis (N/S/E/W), and generates custom map visual assets with auto-placed location markers. Includes a **2D Force-Directed Layout Fallback** if directional lore is ambiguous, preventing coordinate stacking.
2. **📜 Procedural Parchment Cartographer (100% Offline Mode)**: Zero-AI, algorithmic Simplex/Perlin Noise canvas generator running 100% locally in client-side JavaScript. Uses **Elevation-Biome Pin Snapping** (*Harbors* ➔ Coastlines `0.38–0.42`, *Dungeons/Peaks* ➔ Mountains `>0.70`, *Settlements* ➔ Plains `0.45–0.65`).
3. **📌 Auto-Place Unpinned Locations Engine**: Uses a **Spiral Grid-Collision Allocator** to detect unpinned location articles and place them onto any existing map without overlapping existing pins.
4. **Transient Preview Caching**: Generates map previews on HTML5 Canvas in memory (<45ms), only writing image files to disk (`/uploads/images/`) when the user explicitly clicks `Save Map to Vault`, eliminating disk space bloat.

---

## 2. System Architecture & Components

```
+-----------------------------------------------------------------------------------+
|                           AUTOMATED MAP GENERATOR MODAL                           |
|  [ Choice: ✨ AI Spatial Cartographer ]  OR  [ 📜 Offline Procedural Parchment ]  |
+-----------------------------------------------------------------------------------+
                                         |
               +-------------------------+-------------------------+
               |                                                   |
               v                                                   v
+------------------------------------+               +------------------------------------+
| ✨ ENGINE 1: AI SPATIAL ENGINE      |               | 📜 ENGINE 2: PROCEDURAL PARCHMENT   |
| - Gemini Lore Spatial Extraction   |               | - Simplex Noise Elevation Heightmap|
| - Directional N/S/E/W Mapping      |               | - Elevation Biome Pin Snapping     |
| - Force-Directed Layout Fallback   |               |   * Coastlines: Harbors/Ports      |
|   (Prevents pin coordinate stacking)|               |   * Peaks: Dungeons/Citadels       |
|                                    |               |   * Plains: Cities/Settlements     |
|                                    |               | - Theme Styling (Codex / SciFi)    |
+------------------------------------+               +------------------------------------+
                                         |
                                         v
+-----------------------------------------------------------------------------------+
|                        TRANSIENT CANVAS PREVIEW & SAVING                          |
| - Render map preview in-memory on HTML5 Canvas (<45ms, 0 disk bloat)              |
| - [ Save Map to Vault ] ──> Writes PNG to /uploads/images/ & saves to lore.db    |
+-----------------------------------------------------------------------------------+
```

---

## 3. Algorithmic Solutions to Grilling Probes

### A. Probe 1 (Coordinate Stacking Fallback)
When Gemini receives location articles with zero spatial clues, it defaults to a **2D Force-Directed Graph Layout Algorithm**:
- Locations are initialized as graph nodes.
- Repulsion forces (`F_repulsion = k^2 / distance`) push nodes apart to guarantee a minimum normalized separation distance (`min_dist = 0.15`), eliminating pin overlap blobs.

### B. Probe 2 (Elevation-Biome Pin Snapping)
Procedural noise heightmaps evaluate normalized elevation values `E` (`0.0` to `1.0`):
- `0.00 – 0.38`: Water / Ocean
- `0.38 – 0.42`: Coastline / Shore
- `0.42 – 0.70`: Plains / Forest
- `0.70 – 1.00`: Mountain Peaks

Pin categories snap to valid elevation bands:
- *Port / Harbor / Ship*: Snaps to `0.38 – 0.42`
- *Mountain / Peak / Dungeon*: Snaps to `0.70 – 1.00`
- *City / Settlement / Faction*: Snaps to `0.45 – 0.65`

### C. Probe 3 (Spiral Grid-Collision Allocator)
When auto-placing unpinned location entries onto an existing map:
- The canvas is divided into a `20 x 20` grid matrix (`400` spatial cells).
- Cells containing existing pins are marked as `occupied`.
- Unpinned locations use an Archimedean spiral search starting from grid center `(10, 10)` to find the nearest unoccupied cell, guaranteeing zero pin collision.

### D. Probe 4 (Zero-Disk Bloat Caching)
Map previews are rendered in client-side HTML5 Canvas buffers. Disk writes (`fs.writeFileSync`) to `/public/uploads/images/` only execute when the user explicitly clicks `Save Map to Vault`. Discarding or regenerating preview maps leaves zero orphaned files on disk.

---

## 4. Database Schema & API Endpoint Contracts

No database schema changes required (`maps` and `map_pins` tables from V1 Atlas spec are reused).

| Method | Endpoint | Description | Request Body | Response Payload |
| :--- | :--- | :--- | :--- | :--- |
| `POST` | `/api/maps/auto-generate/ai` | AI Spatial Map & Pin Generation | JSON: `{ world_id, title }` | `{ success: true, map, pins }` |
| `POST` | `/api/maps/auto-generate/procedural` | Procedural Parchment Map Generation | JSON: `{ world_id, title, theme }` | `{ success: true, map, pins, dataUrl }` |
| `POST` | `/api/maps/:mapId/auto-pin` | Auto-place unpinned locations on map | JSON: `{ world_id }` | `{ success: true, addedPins: Array<Pin> }` |

---

## 5. Quality Assurance & Test Suite (`scratch/test-cartographer-suite.js`)

1. **Simplex Noise & Biome Snapping Test**:
   - Verify coastal pins snap to `0.38–0.42` elevation.
   - Verify mountain pins snap to `>0.70` elevation.
2. **Force-Directed Layout Test**:
   - Pass 10 un-directioned location names and verify all generated pin pairs satisfy `distance >= 0.15`.
3. **Spiral Grid Allocation Test**:
   - Place 20 pins and verify 0 grid cell collisions.
