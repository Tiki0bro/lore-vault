# Task 1 Report: Database Schema & REST API Endpoints for Atlas v2

**Plan:** `docs/superpowers/plans/2026-08-11-interactive-world-atlas-v2.md`
**Timestamp:** 2026-08-11
**Status:** Completed & Verified

---

## 1. Executive Summary

Task 1 of the Interactive World Atlas v2 feature set has been fully implemented and empirically verified. The database schema of LoreVault was expanded to support nested multi-level map hierarchies, interactive scale calibration, and custom map routes/paths with DM/Player secret visibility controls. All associated REST API endpoints were implemented in `server.js` and verified through automated test suites in `scratch/test-atlas-v2-backend.js`.

---

## 2. Changes Implemented

### Database Schema Updates (`server.js`)

1. **`maps` Table Additions**:
   - `parent_map_id TEXT REFERENCES maps(id)`: Links a sub-map to its parent map in the hierarchy tree.
   - `parent_pin_id TEXT`: Optional link to the specific parent pin that drills down into this sub-map.
   - `scale_pixels REAL DEFAULT 100.0`: The pixel length of the map scale bar.
   - `scale_distance REAL DEFAULT 10.0`: The real-world distance corresponding to `scale_pixels`.
   - `scale_unit TEXT DEFAULT 'miles'`: Unit of measurement ('miles', 'km', 'leagues', 'feet', 'm').
   - *Migration Safety*: Safe `ALTER TABLE` statements added to handle pre-existing databases without throwing runtime errors.

2. **`map_pins` Table Additions**:
   - `target_sub_map_id TEXT`: Link target for sub-map drilldown.
   - `category TEXT DEFAULT 'Location'`: Categorization tag for pin filtering ('Location', 'Settlement', 'Dungeon', 'Landmark', etc.).
   - *Migration Safety*: Safe `ALTER TABLE` statements added for existing database sync.

3. **`map_routes` Table Creation**:
   ```sql
   CREATE TABLE IF NOT EXISTS map_routes (
     id TEXT PRIMARY KEY,
     map_id TEXT NOT NULL,
     layer_id TEXT,
     title TEXT NOT NULL,
     points_json TEXT NOT NULL,
     stroke_color TEXT DEFAULT '#f59e0b',
     stroke_width INTEGER DEFAULT 3,
     stroke_style TEXT DEFAULT 'dashed',
     calculated_distance REAL DEFAULT 0.0,
     is_secret INTEGER DEFAULT 0,
     created_at TEXT DEFAULT CURRENT_TIMESTAMP,
     FOREIGN KEY (map_id) REFERENCES maps(id) ON DELETE CASCADE
   );
   ```

---

### REST API Endpoints (`server.js`)

1. **Hierarchy Tree Endpoint (`GET /api/maps/:mapId/tree`)**:
   - Resolves target map, immediate parent map, child sub-maps list, and ordered array of ancestors (from world root map down to immediate parent).
   - Includes circular reference safeguards.

2. **Scale Calibration Endpoint (`PUT /api/maps/:mapId/scale`)**:
   - Accepts `{ scale_pixels, scale_distance, scale_unit }`.
   - Calibrates map measurement scale and updates `updated_at` timestamp.
   - Returns `{ success: true, map }`.

3. **Map Routes Fetch (`GET /api/maps/:mapId/routes`)**:
   - Fetches map routes ordered by creation date.
   - Supports `?mode=player` filtering to automatically hide secret routes (`is_secret = 1`) when viewed in Player Mode.

4. **Map Route Upsert (`POST /api/maps/:mapId/routes`)**:
   - Accepts route payload (`id`, `layer_id`, `title`, `points_json`, `stroke_color`, `stroke_width`, `stroke_style`, `calculated_distance`, `is_secret`).
   - Creates or updates route in `map_routes` table using `ON CONFLICT(id) DO UPDATE`.
   - Returns `{ success: true, route }`.

5. **Map Route Deletion (`DELETE /api/maps/:mapId/routes/:routeId`)**:
   - Deletes route by ID and map ID.
   - Returns `{ success: true, deleted: <count> }`.

---

## 3. Verification & Testing

A standalone test script `scratch/test-atlas-v2-backend.js` was created and executed against an active HTTP test server instance.

### Test Results
- **Schema Verification**: Confirmed columns present in `maps`, `map_pins`, and table creation of `map_routes`.
- **Tree Hierarchy Resolution**: Verified multi-tier ancestor chain resolution (`Root -> Kingdom -> City`).
- **Scale Calibration**: Verified precise pixel-to-distance unit persistence.
- **Route Operations & Player Mode**: Verified creation of public/secret routes, player mode filtering (`is_secret = 0`), and clean route deletion.

```text
--- Starting Atlas v2 Backend Verification Tests ---

[1/4] Verifying Database Schemas...
✓ maps table contains all required columns: parent_map_id, parent_pin_id, scale_pixels, scale_distance, scale_unit
✓ map_pins table contains all required columns: target_sub_map_id, category
✓ map_routes table exists and contains all required columns.

[2/4] Testing Hierarchy Tree API Endpoint GET /api/maps/:mapId/tree...
✓ Tree endpoint correctly resolved parent and ancestors hierarchy.

[3/4] Testing Scale Calibration API Endpoint PUT /api/maps/:mapId/scale...
✓ Scale calibration endpoint correctly updated pixel scale & units.

[4/4] Testing Routes API Endpoints (POST, GET, DELETE)...
✓ Player mode secret filtering correctly hides secret routes.
✓ Route creation, player filtering, and deletion operating nominally.

======================================================
ALL ATLAS V2 BACKEND TESTS PASSED SUCCESSFULLY! 🎉
======================================================
```

---

## 4. DECISIONS.md Architectural Entry

Updated `DECISIONS.md` under DB/API Architecture section with concise summary:
- Added `map_routes` table and column additions for parent hierarchy (`parent_map_id`, `parent_pin_id`) and scale calibration (`scale_pixels`, `scale_distance`, `scale_unit`) to support Atlas v2 interactive features. All REST endpoints handle `?mode=player` secret filtering cleanly at the query level.
