# Design Specification: Interactive Territory Boundaries, Contested Zones, Custom Map Layers, and AI Auto-Cartography

**Date**: 2026-08-10  
**Author**: Arthur "The Griller" Vance & The LoreVault Architecture Team  
**Status**: Approved (Pending Implementation Plan)  

---

## 1. Overview & Objectives

LoreVault's Interactive World Atlas currently supports image maps, Leaflet pin placement, article linking, DM vs. Player views, and standalone HTML exporting. 

This specification introduces **Territory Boundary Polygons**, **Contested Border Zones**, a **Custom Map Layer Engine**, and **AI-Powered Territory Auto-Detection (Multimodal Vision + Lore Context)** to achieve feature parity with leading worldbuilding platforms (World Anvil, LegendKeeper) while maintaining LoreVault's fast, local-first architecture.

---

## 2. Core Features

### 2.1 Freeform Territory Boundary Polygons
- **Vector Polygons**: Users can trace freeform boundaries on map canvases using Leaflet vector layers.
- **Normalized Float Coordinates**: Vertices are stored as float percentage pairs `[x_pct, y_pct]` (range $0.0 \text{ to } 1.0$) to guarantee accurate positioning across all screen sizes and viewport zooms.
- **Linked Lore**: Each boundary links to a **Faction**, **Nation**, or **Geography** article.
- **Rich Visual Styling**:
  - Custom stroke color (hex picker).
  - Stroke style (`solid`, `dashed`, `dotted`) & stroke width ($1\text{px} - 8\text{px}$).
  - Custom fill color and opacity slider ($0\% - 100\%$).
- **Interactive Vertex Editing**:
  - Selecting a territory surfaces draggable vertex handle markers (`L.CircleMarker`).
  - Drag handles to reshape borders.
  - Click midpoint handles to insert new vertices.
  - Right-click vertex handle to delete node.
  - 1-click "Redraw Boundary" reset button.

### 2.2 Contested Overlap & Conflict Lore Generator
- **Polygon Intersection Detection**: Client-side geometry check flags overlapping territory regions.
- **Visual Warning Cue**: Overlapping polygon regions render with a semi-transparent cross-hatched SVG pattern fill (`pattern-stripe`).
- **Interactive Conflict Drawer**: Clicking a contested zone presents:
  - Links to both overlapping Faction/Nation lore articles.
  - Option to link an existing "Border Dispute / War" article.
  - 1-click `🤖 AI Draft Border Conflict History` generator.

### 2.3 Custom Map Layer Engine
- **Layer Organization**: Pins and territories can be assigned to map layers.
- **Default System Layers**:
  - `Political Borders`
  - `Location Pins`
  - `Trade & Travel Routes`
- **Custom User Layers**: Users can create, rename, recolor, and re-order custom layers (e.g., *"3rd Era Kingdoms"*, *"Subterranean Realm"*, *"Monster Habitats"*).
- **Layer Visibility Toggles**: Viewport floating Layer Control panel allows 1-click layer visibility toggles (`👁️`) and secret lock status (`🔒`).

### 2.4 Hybrid DM Secrets Visibility
- **DM Only Boundary**: Entire boundary polygon hidden from Public Player View.
- **Public Boundary with Filtered Lore**: Boundary line visible to players, but clicking it in Public Player View automatically strips `[secret]...[/secret]` tags from linked lore articles.

### 2.5 🤖 AI-Powered Territory Auto-Detection (Vision + Lore Context)
- **Multimodal Image + Context Analysis**:
  - Endpoint `POST /api/maps/:mapId/ai-auto-boundaries` passes the map image to Gemini Vision alongside vault articles in `Factions & Nations`, `Geography`, and `Races & Species`.
  - Gemini Vision analyzes visual landmarks (coastlines, mountain ranges, rivers, labeled region text on map artwork) alongside text lore descriptions (e.g., *"The Ironfang Horde controls the eastern mountain ranges past the Whispering River"*).
- **Candidate Polygon Output**: AI returns JSON candidate territory objects:
  ```json
  {
    "territories": [
      {
        "title": "Ironfang Hold Domain",
        "article_id": "art_1029",
        "stroke_color": "#dc2626",
        "fill_color": "#dc2626",
        "fill_opacity": 0.25,
        "points": [[0.12, 0.45], [0.18, 0.42], [0.25, 0.55], [0.15, 0.60]]
      }
    ]
  }
  ```
- **Ghost Preview & Approval Drawer**:
  - Proposed AI boundaries render as pulsing dashed "ghost" polygons on the map canvas.
  - User can check/uncheck candidates, tweak vertex handles on the fly, and click `[✓ Approve & Save Boundaries]` to persist them to `lore.db`.

---

## 3. Database Schema & Data Models

### `map_layers`
```sql
CREATE TABLE IF NOT EXISTS map_layers (
  id TEXT PRIMARY KEY,
  map_id TEXT NOT NULL,
  name TEXT NOT NULL,
  color_badge TEXT DEFAULT '#38bdf8',
  is_visible INTEGER DEFAULT 1,
  is_secret INTEGER DEFAULT 0,
  sort_order INTEGER DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (map_id) REFERENCES maps(id) ON DELETE CASCADE
);
```

### `map_territories`
```sql
CREATE TABLE IF NOT EXISTS map_territories (
  id TEXT PRIMARY KEY,
  map_id TEXT NOT NULL,
  layer_id TEXT,
  article_id TEXT,
  title TEXT NOT NULL,
  points_json TEXT NOT NULL, -- JSON string array of [x_pct, y_pct]
  stroke_color TEXT DEFAULT '#ef4444',
  stroke_width INTEGER DEFAULT 3,
  stroke_style TEXT DEFAULT 'solid', -- 'solid', 'dashed', 'dotted'
  fill_color TEXT DEFAULT '#ef4444',
  fill_opacity REAL DEFAULT 0.25,
  is_contested INTEGER DEFAULT 0,
  contested_article_id TEXT,
  is_secret INTEGER DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (map_id) REFERENCES maps(id) ON DELETE CASCADE,
  FOREIGN KEY (layer_id) REFERENCES map_layers(id) ON DELETE SET NULL,
  FOREIGN KEY (article_id) REFERENCES articles(id) ON DELETE SET NULL
);
```

### `map_pins` (Column Addition)
```sql
ALTER TABLE map_pins ADD COLUMN layer_id TEXT REFERENCES map_layers(id) ON DELETE SET NULL;
```

---

## 4. API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/maps/:mapId/layers` | Fetch all layers for a map |
| `POST` | `/api/maps/:mapId/layers` | Create a new map layer |
| `DELETE` | `/api/maps/:mapId/layers/:layerId` | Delete a map layer |
| `GET` | `/api/maps/:mapId/territories` | Fetch all territories for a map |
| `POST` | `/api/maps/:mapId/territories` | Create a new territory polygon |
| `PUT` | `/api/maps/:mapId/territories/:territoryId` | Update territory styling, vertices, or article links |
| `DELETE` | `/api/maps/:mapId/territories/:territoryId` | Delete a territory polygon |
| `POST` | `/api/maps/:mapId/ai-auto-boundaries` | Trigger Gemini Vision + Lore Context territory auto-detection |

---

## 5. UI/UX & Component Architecture

1. **Atlas View Toolbar Upgrades** ([public/js/atlas-view.js](file:///c:/Users/EthenGreening/.gemini/antigravity/scratch/lore-vault/public/js/atlas-view.js)):
   - Add `[🗺️ Draw Boundary]`, `[🤖 Auto-Detect Borders]`, and `[🥞 Layers]` toolbar buttons.
   - Floating Layer Manager panel with drag-and-drop sort order & visibility toggles.
2. **Interactive Drawing & Vertex Edit Mode**:
   - Reticle pointer and active vertex polyline preview while placing nodes.
   - Floating control toast: `[✓ Complete Boundary] [✕ Cancel] [↺ Redraw]`.
3. **AI Ghost Preview Drawer**:
   - Displays detected candidate boundaries with checkboxes, matching confidence scores, linked lore article titles, and 1-click batch import.
4. **Territory Properties Modal**:
   - Form inputs for title, linked article dropdown, layer assignment, stroke color, stroke width, stroke style, fill color, fill opacity slider, contested zone article link, and DM secret checkbox.

---

## 6. Verification & Testing Plan

1. **Schema & Migration Test**: Verify SQLite tables `map_layers` and `map_territories` are initialized without error in `database/lore.db`.
2. **API Endpoint Verification**: Test CRUD operations for layers and territories using standard HTTP requests.
3. **Gemini Vision Auto-Boundaries Test**: Mock/test `POST /api/maps/:mapId/ai-auto-boundaries` payload parsing and candidate boundary rendering.
4. **Coordinate Scaling & Zoom Safety**: Verify polygons scale accurately when zooming/panning Leaflet canvas or resizing the browser window.
5. **DM vs. Player View Filtering**: Verify secret boundaries vanish in Player View and secret article tags are stripped.
6. **Standalone HTML Exporter**: Verify exported atlas bundle includes full layer and territory rendering.
