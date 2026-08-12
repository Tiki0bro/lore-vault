# Design Specification: Interactive World Atlas & Public Sharing Suite

**Document Version**: 1.0.0  
**Date**: 2026-08-10  
**Author**: Ethen (Product Owner) & Antigravity AI  
**Status**: Approved  
**Target Path**: `docs/superpowers/specs/2026-08-10-interactive-world-atlas-design.md`

---

## 1. Executive Summary & Goal

LoreVault requires an interactive world presentation mode—similar to World Anvil's presentation mode and LegendKeeper's pan/zoom cartography—allowing worldbuilders, authors, and Game Masters to visually showcase world maps, pin lore articles onto locations, filter public vs. DM secrets, and share interactive lore experiences via live web links or standalone static HTML packages.

The **Interactive World Atlas & Public Sharing Suite** provides:
1. **Interactive Cartographer**: Full-screen canvas powered by Leaflet.js (`L.CRS.Simple`) for custom map images (`.jpg`, `.png`, `.webp`, `.svg`) with normalized float coordinates (`0.0`–`1.0`) for responsive pin placement across devices.
2. **Sub-Map Hierarchy**: Multi-tier map nesting (e.g. World Map ➔ Kingdom Map ➔ City Map ➔ Dungeon Map).
3. **Presentation Reader Drawer**: Dual-mode (DM Canon View vs Public Player View) reader drawer for inspecting linked worldbuilding articles with automated secret/spoiler sanitization.
4. **Dual Sharing Engine**:
   - **Live Express Gateway**: Direct read-only route (`/view/:shareToken`) with server-side secret stripping and Open Graph meta tags for rich social media previews (Discord, Twitter).
   - **Standalone Web Exporter**: 1-click exporter bundling map assets, pin datasets, and Leaflet runtime into a single portable `.html` file (`lore-vault-atlas-[world].html`) or static ZIP for offline viewing or free hosting (GitHub Pages, Vercel).

---

## 2. Architecture & Subsystems

```
+-----------------------------------------------------------------------------------+
|                              LoreVault Core Web App                               |
|  +---------------------+   +--------------------------+   +---------------------+ |
|  |   📚 Lore Codex     |   |   🗺️ World Atlas View   |   |   🔮 Weave Matrix   | |
|  +---------------------+   +--------------------------+   +---------------------+ |
+-----------------------------------------------------------------------------------+
                                          |
                                          v
+-----------------------------------------------------------------------------------+
|                        Interactive Cartographer Subsystem                         |
|  +-----------------------------------------------------------------------------+  |
|  | Controls Bar: [Map Switcher] [+ Add Pin] [DM Canon / Player View Toggle]     |  |
|  +-----------------------------------------------------------------------------+  |
|  |                                      |                                      |  |
|  |  Leaflet.js Pan/Zoom Image Canvas     |  Presentation Reader Drawer           |  |
|  |  - Coordinate Space: L.CRS.Simple    |  - Pins overview & article detail    |  |
|  |  - Pin Markers (Normalized x_pct/y) |  - Dynamic themeing (Parchment/SciFi)|  |
|  |  - Category Color/Icon Badges        |  - Secret section stripper           |  |
|  |                                      |                                      |  |
|  +-----------------------------------------------------------------------------+  |
+-----------------------------------------------------------------------------------+
                                          |
                                          v
+-----------------------------------------------------------------------------------+
|                               Dual Sharing Engine                                 |
|  +-----------------------------------------+ +----------------------------------+ |
|  | A. Live Express Gateway                 | | B. Standalone Static Bundle      | |
|  | Route: GET /view/:shareToken            | | Route: POST /api/export/atlas  | |
|  | OpenGraph preview cards for social media | | Output: Single-file .html bundle | |
|  +-----------------------------------------+ +----------------------------------+ |
+-----------------------------------------------------------------------------------+
```

---

## 3. Database Schema (`lore.db` SQLite)

Two new tables are added to `lore.db` with strict foreign key constraints and cascade deletion:

```sql
-- 1. Maps Table
CREATE TABLE IF NOT EXISTS maps (
    id TEXT PRIMARY KEY,
    world_id TEXT NOT NULL,
    parent_map_id TEXT REFERENCES maps(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    description TEXT DEFAULT '',
    image_path TEXT NOT NULL,
    width INTEGER NOT NULL,
    height INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (world_id) REFERENCES worlds(id) ON DELETE CASCADE
);

-- 2. Map Pins Table
CREATE TABLE IF NOT EXISTS map_pins (
    id TEXT PRIMARY KEY,
    map_id TEXT NOT NULL,
    article_id TEXT REFERENCES articles(id) ON DELETE CASCADE,
    x_pct REAL NOT NULL, -- Normalized X float (0.0 to 1.0)
    y_pct REAL NOT NULL, -- Normalized Y float (0.0 to 1.0)
    label TEXT NOT NULL,
    pin_icon TEXT DEFAULT 'fa-location-dot',
    pin_color TEXT DEFAULT '#d97706',
    is_secret INTEGER DEFAULT 0, -- 0 = Public, 1 = DM Only
    sub_map_id TEXT REFERENCES maps(id) ON DELETE SET NULL, -- Optional link to nested sub-map
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (map_id) REFERENCES maps(id) ON DELETE CASCADE
);
```

---

## 4. API Endpoint Contracts

| Method | Endpoint | Description | Request Body / Query | Response Payload |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/worlds/:worldId/maps` | Fetch all maps for a world | Query: None | `{ maps: Array<Map> }` |
| `POST` | `/api/maps` | Create new map | Multipart form: `world_id`, `title`, `parent_map_id`, `image` file | `{ success: true, map: Map }` |
| `DELETE` | `/api/maps/:id` | Delete map and associated pins | None | `{ success: true }` |
| `GET` | `/api/maps/:mapId/pins` | Fetch pins for a map | Query: `mode=dm` or `mode=player` | `{ pins: Array<Pin> }` |
| `POST` | `/api/map-pins` | Create or update pin | JSON: `{ map_id, article_id, x_pct, y_pct, label, pin_icon, pin_color, is_secret, sub_map_id }` | `{ success: true, pin: Pin }` |
| `DELETE` | `/api/map-pins/:id` | Remove a map pin | None | `{ success: true }` |
| `GET` | `/view/:shareToken` | Serve public live atlas view | Query: None | Rendered HTML with OpenGraph tags |
| `POST` | `/api/export/atlas/:worldId` | Generate standalone HTML bundle | JSON: `{ mode: 'player' \| 'dm' }` | Downloadable single-file HTML response |

---

## 5. Secret & Spoiler Sanitization Engine

When viewing the atlas in **Public Player View** or exporting a public static HTML package:
1. `map_pins` entries with `is_secret = 1` are completely omitted from the payload.
2. Article text sent to the reader drawer is processed through the Secret Sanitizer:
   - Strips `[secret]...[/secret]` blocks.
   - Removes tags matching `#dm-only` or `#secret`.
   - Replaces secret cross-links with `[Redacted Lore]`.

---

## 6. UI/UX Specifications

### Header & Navigation Integration
- Access point: Added to `⚙️ Tools & World Actions` dropdown and top view tab bar (`📚 Lore Codex`, `🗺️ World Atlas`, `🔮 Weave Matrix`).
- Dynamic Reticle Placement: Toggling `[+ Add Pin]` changes the canvas cursor to a crosshair target reticle. A floating toast notification provides a `[Cancel Pin Placement]` button.

### Presentation Reader Drawer & Themes
- Inherits core theme tokens:
  - `ancient-codex`: RPG compass rose markers, parchment card popups, gold borders.
  - `scifi-fantasy`: Cyan holographic target markers, slate popups, neon telemetry accents.
  - `data-mode="light"`: Ivory canvas `#faf6ed` with espresso typography `#2c221e`.

---

## 7. Testing & Quality Assurance Plan

### Automated Test Suite (`scratch/test-atlas-suite.js`)
1. **Database & Schema Validation**:
   - Verify table creation, primary keys, and foreign key CASCADE deletes.
2. **Normalized Coordinate Bounds Test**:
   - Verify values outside `0.0`–`1.0` are clamped gracefully.
3. **Secret Stripping Verification**:
   - Confirm player-mode API responses omit secret pins and strip `[secret]` text tags.
4. **Static HTML Bundle Generation**:
   - Verify `POST /api/export/atlas/:worldId` builds a valid single-file HTML document containing embedded Leaflet scripts, map data, and CSS without broken references.

---

## 8. Open Questions & Future Enhancements

- **V2 Scope**: Fog-of-War exploration layer for TTRPG session reveals.
- **V2 Scope**: Custom Leaflet tile generator for multi-gigapixel fantasy maps.
