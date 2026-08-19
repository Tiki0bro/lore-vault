# Stage 3: Implementation Plan & Team Validation
**Feature**: World Atlas v7 Master Suite: Spatial Pin Auto-Clustering, VTT Character Tokens & Faction Control Heatmap
**Date**: 2026-08-20
**Feature Loop Directory**: `docs/feature-loops/2026-08-20-world-atlas-v7-master-suite/`

---

## 🎯 Implementation Steps

### Task 1: SQLite Table `map_character_tokens` & REST APIs (`server.js`)
- [x] Create `map_character_tokens` table.
- [x] Add REST routes: `GET/POST/PUT/DELETE /api/maps/:mapId/tokens`.

### Task 2: Spatial Pin Auto-Clustering Engine (`public/js/atlas-view.js`)
- [x] Add cluster calculation logic in `renderPinsOnCanvas()` for zoom levels < 3.
- [x] Render cluster marker badges `[N]` with click-to-zoom expansion.

### Task 3: Spatial Faction Control Heatmap (`public/js/atlas-view.js`)
- [x] Add `toggleFactionHeatmap()` method styling territory polygons with faction influence gradients.

### Task 4: QA Verification Suite (`scratch/test-world-atlas-v7-master.js`)
- [x] Create verification test script testing `map_character_tokens` table, cluster math, and faction heatmap styling.

---

## 🔍 Arthur's Implementation Plan Interrogation

- **Arthur**: *"Alex, pass or fail on database schema stability?"*
- **Alex**: *"Pass. `map_character_tokens` table creation uses `CREATE TABLE IF NOT EXISTS` with zero impact on existing tables."*
- **Arthur**: *"Riley, how do we verify cluster math during QA?"*
- **Riley**: *"We will run `scratch/test-world-atlas-v7-master.js` to assert pin clustering when coordinates are within 40px radius."*

---

**Gate 2 Verdict**: APPROVED BY ARTHUR VANCE & DEV TEAM. Proceeding to Stage 4 (Execution & QA Verification).
