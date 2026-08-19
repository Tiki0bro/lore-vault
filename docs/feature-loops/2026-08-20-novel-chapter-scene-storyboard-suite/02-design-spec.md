# Stage 2: Design Spec & Gap Remediation Loop
**Feature**: Novel Chapter & Scene Location Storyboard Suite
**Date**: 2026-08-20
**Feature Loop Directory**: `docs/feature-loops/2026-08-20-novel-chapter-scene-storyboard-suite/`

---

## 🛠️ Technical Design Specification

### 1. SQLite Schema Migration & REST Endpoints (`server.js`)
- **Table Additions**:
  - Add `chapter_num INTEGER DEFAULT NULL` and `scene_id TEXT DEFAULT NULL` columns to `map_pins` table in `server.js` startup migration.
- **REST Endpoints**:
  - `GET /api/maps/:mapId/storyboard` (Returns map pins grouped by chapter number with linked scene metadata and character cast lists).
  - `PUT /api/map-pins/:pinId/storyboard` (Updates `chapter_num` and `scene_id` for a pin marker).

### 2. UI Storyboard Header Bar & Chapter Filtering (`public/js/atlas-view.js` & `public/css/styles.css`)
- **Floating Header Bar `#atlas-storyboard-bar`**:
  - Renders horizontal chip list: `[📖 All Chapters]`, `Ch 1`, `Ch 2`, `Ch 3`, `Ch 4`...
  - Selecting a chapter chip:
    - Filters visible pins on map canvas to those tagged to the selected chapter.
    - Renders gold polyline path `#storyboard-travel-path` connecting chapter location pins in chronological sequence!
- **Pin Drawer Actions**:
  - Add dropdown selector `Chapter Tag:` and `Linked Scene:` in `#atlas-pin-modal`.
  - Add action button `[🎬 Open Scene Slate in Weave Matrix]` in `openArticleDrawer()`.

---

## 🔍 Arthur's Line-by-Line Spec Interrogation

- **Arthur**: *"Elena, how does an author assign Chapter 2 to a location pin?"*
- **Elena**: *"When editing or creating a pin in `#atlas-pin-modal`, there is a dropdown `Chapter Number` and `Linked Scene Slate`. Selecting Chapter 2 tags the pin immediately."*
- **Arthur**: *"Alex, how does the polyline travel path know the chronological order of locations?"*
- **Alex**: *"It orders location pins by `scene_sequence_order` or pin creation timestamp for that chapter, connecting coordinates `(x_pct, y_pct)` with a dashed gold polyline."*
- **Arthur**: *"Riley, what if no pins are tagged to Chapter 5?"*
- **Riley**: *"Selecting Chapter 5 displays a helpful prompt in the Storyboard Bar: 'No map pins tagged to Chapter 5 yet. Click any pin to assign Chapter 5!'"*

---

**Gate 1 Verdict**: APPROVED BY ARTHUR VANCE & TEAM. Proceeding to Stage 3 (Implementation Plan).
