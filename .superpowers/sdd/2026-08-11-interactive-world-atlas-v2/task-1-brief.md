# Task 1 Brief: Database Schema & REST API Endpoints for Atlas v2

**Plan:** `docs/superpowers/plans/2026-08-11-interactive-world-atlas-v2.md`

## Requirements

1. Modify `server.js`:
   - Execute safe column additions (wrapping in `try...catch` so column existence errors don't crash server):
     - `maps`: `parent_map_id`, `parent_pin_id`, `scale_pixels` (REAL default 100.0), `scale_distance` (REAL default 10.0), `scale_unit` (TEXT default 'miles').
     - `map_pins`: `target_sub_map_id`, `category` (TEXT default 'Location').
   - Create `map_routes` table in `server.js`:
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
   - REST API Endpoints:
     - `GET /api/maps/:mapId/tree`: Returns `{ map, parentMap, childMaps, ancestors: [...] }`.
     - `PUT /api/maps/:mapId/scale`: Accepts `{ scale_pixels, scale_distance, scale_unit }`, updates scale calibration, returns `{ map }`.
     - `GET /api/maps/:mapId/routes`: Returns `{ routes: [...] }` with player mode secret filtering (`?mode=player`).
     - `POST /api/maps/:mapId/routes`: Accepts route payload, inserts into `map_routes`, returns `{ route }`.
     - `DELETE /api/maps/:mapId/routes/:routeId`: Deletes route, returns `{ success: true }`.
2. Verification:
   - Create `scratch/test-atlas-v2-backend.js` testing schema updates and REST endpoints.

## Report File Location
`.superpowers/sdd/2026-08-11-interactive-world-atlas-v2/task-1-report.md`
