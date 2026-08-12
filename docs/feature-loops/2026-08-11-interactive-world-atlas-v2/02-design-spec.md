# Feature Loop Stage 2: Design Specification
**Feature**: Interactive World Atlas v2 (Nested Sub-Maps, Scale Ruler, Pin Search & Expedition Paths)
**Date**: 2026-08-11
**Status**: Stage 2 Design Spec Complete (Pending Gate 1 Approval)

---

## 1. Overview & Architectural Objectives

Version 2 of the Interactive World Atlas introduces nested multi-tier map navigation, map scale calibration, distance measurement tools, pin filtering & search, and expedition route drawing to LoreVault.

---

## 2. Technical Specifications & Data Models

### 2.1 Schema Extensions (`database/lore.db`)

#### `maps` Table Additions
```sql
ALTER TABLE maps ADD COLUMN parent_map_id TEXT REFERENCES maps(id) ON DELETE SET NULL;
ALTER TABLE maps ADD COLUMN parent_pin_id TEXT REFERENCES map_pins(id) ON DELETE SET NULL;
ALTER TABLE maps ADD COLUMN scale_pixels REAL DEFAULT 100.0;
ALTER TABLE maps ADD COLUMN scale_distance REAL DEFAULT 10.0;
ALTER TABLE maps ADD COLUMN scale_unit TEXT DEFAULT 'miles';
```

#### `map_pins` Table Additions
```sql
ALTER TABLE map_pins ADD COLUMN target_sub_map_id TEXT REFERENCES maps(id) ON DELETE SET NULL;
ALTER TABLE map_pins ADD COLUMN category TEXT DEFAULT 'Location';
```

#### `map_routes` Table (New)
```sql
CREATE TABLE IF NOT EXISTS map_routes (
  id TEXT PRIMARY KEY,
  map_id TEXT NOT NULL,
  layer_id TEXT,
  title TEXT NOT NULL,
  points_json TEXT NOT NULL, -- JSON array of [x_pct, y_pct]
  stroke_color TEXT DEFAULT '#f59e0b',
  stroke_width INTEGER DEFAULT 3,
  stroke_style TEXT DEFAULT 'dashed',
  calculated_distance REAL DEFAULT 0.0,
  is_secret INTEGER DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (map_id) REFERENCES maps(id) ON DELETE CASCADE,
  FOREIGN KEY (layer_id) REFERENCES map_layers(id) ON DELETE SET NULL
);
```

---

## 3. UI/UX Component Specifications

1. **Breadcrumb Navigation Bar (`#atlas-breadcrumbs`)**:
   - Floating glassmorphic header pill displaying map hierarchy (`World of Aethelgard > Kingdom of Valoria > Oakhaven Citadel`).
   - Clicking any ancestor breadcrumb instantly switches canvas to that map.

2. **Distance Scale Ruler & Measuring Tape Tool (`#atlas-ruler-tool`)**:
   - Calibrate scale button (`📏 Calibrate Scale`) allowing DM to drag a line on map and input distance ($X\text{ miles/km}$).
   - Measuring tape toggle button: click two or more points on map canvas to display real-time distance pill (`142.5 miles (approx. 4.7 days travel on foot, 2.3 days horseback)`).

3. **Pin Search & Category Filters (`#atlas-pin-filter-bar`)**:
   - Search bar input in atlas toolbar with real-time text matching and auto-zoom to pin location.
   - Filter chips (`All`, `Settlements`, `Fortresses`, `Dungeons`, `Natural Wonders`, `Quests`).

4. **Expedition Path Drawing (`#atlas-route-tool`)**:
   - Connect pins or freeform points to draw campaign routes with distance totals displayed in reader drawer.

---

## 4. API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/maps/:mapId/tree` | Fetch parent and child sub-map hierarchy tree |
| `PUT` | `/api/maps/:mapId/scale` | Update map scale calibration (`scale_pixels`, `scale_distance`, `scale_unit`) |
| `GET` | `/api/maps/:mapId/routes` | Fetch all expedition routes for a map |
| `POST` | `/api/maps/:mapId/routes` | Create a new expedition route |
| `DELETE` | `/api/maps/:mapId/routes/:routeId` | Delete an expedition route |

---

## 5. 🔥 Arthur's Gate 1 Socratic Review & Persona Sign-Offs

- **👔 Ethen (PO)**: Approved — high-impact features scoped cleanly without breaking v1 maps.
- **🧪 Riley (QA)**: Approved — database schema additions use `NULL` defaults, avoiding breaking changes on existing database files.
- **🎭 Alex (Dev)**: Approved — clean REST API endpoints for routes and sub-map tree navigation.
- **🎨 Maya (UI/UX)**: Approved — glassmorphic breadcrumb bar positioned at top center prevents drawer clipping.
