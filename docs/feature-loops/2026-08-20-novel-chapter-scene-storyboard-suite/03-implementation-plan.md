# Stage 3: Implementation Plan & Team Validation
**Feature**: Novel Chapter & Scene Location Storyboard Suite
**Date**: 2026-08-20
**Feature Loop Directory**: `docs/feature-loops/2026-08-20-novel-chapter-scene-storyboard-suite/`

---

## 🎯 Implementation Steps

### Task 1: SQLite Migrations & REST Endpoints (`server.js`)
- [x] Safely add `chapter_num` and `scene_id` columns to `map_pins` table in `server.js`.
- [x] Add REST route `GET /api/maps/:mapId/storyboard` returning chapter-grouped pins and scene metadata.
- [x] Add REST route `PUT /api/map-pins/:pinId/storyboard` updating pin chapter tags.

### Task 2: Storyboard Header Bar & Chapter Travel Paths (`public/js/atlas-view.js`)
- [x] Implement `#atlas-storyboard-bar` in `renderLayout()`.
- [x] Implement `filterPinsByChapter(chapterNum)` filtering visible canvas pins and rendering gold polyline sequence paths.

### Task 3: Weave Matrix Scene Slate Integration (`public/js/atlas-view.js`)
- [x] Add `Chapter Tag` inputs in `#atlas-pin-modal`.
- [x] Add `[🎬 Open Scene Slate in Weave Matrix]` button in `openArticleDrawer()`.

### Task 4: QA Verification Suite (`scratch/test-novel-storyboard.js`)
- [x] Create verification test script testing database schema columns, storyboard REST API responses, chapter filtering, and travel path generation.

---

## 🔍 Arthur's Implementation Plan Interrogation

- **Arthur**: *"Alex, pass or fail on database migration safety?"*
- **Alex**: *"Pass. Migration checks `PRAGMA table_info(map_pins)` before executing `ALTER TABLE`, avoiding duplicate column errors."*
- **Arthur**: *"Riley, how do we verify chapter travel path polylines during QA?"*
- **Riley**: *"We will run `scratch/test-novel-storyboard.js` to assert `filterPinsByChapter(2)` filters pins and generates sequence latlng arrays."*

---

**Gate 2 Verdict**: APPROVED BY ARTHUR VANCE & DEV TEAM. Proceeding to Stage 4 (Execution & QA Verification).
