# Design Specification — Next-Gen Triple Feature Suite (Zen Typewriter, Rumor Broadsheet, Settlement Builder)

**Topic**: Next-Gen Triple Feature Suite (Features 1, 2, 3)  
**Date**: 2026-08-21  
**Status**: APPROVED DESIGN  

---

## 1. Feature Specifications

### 1.1 Zen Typewriter Mode & Ambient Soundscape Suite
- **UI Elements**: `#zen-mode-container` modal in `public/index.html`, full-screen distraction-free editor, Web Audio procedural ambient soundscape generator (Tavern, Rain, Dungeon, Campfire), WPM sprint counter.
- **Controller**: `openZenTypewriterMode()`, `toggleAmbientSoundscape(type)`, `closeZenTypewriterMode()` in `public/js/app.js`.

### 1.2 In-Universe Broadsheet & Tavern Rumor Generator
- **Endpoint**: `POST /api/simulation/generate-rumors`
  - Accepts `{ world_id, count, reliability }`
  - Returns `{ headline, leadStory, rumors: [{ id, text, reliability, source }] }`
- **UI Elements**: `#rumor-generator-modal` in `public/index.html`, broadsheet parchment preview, 1-click save as lore article.

### 1.3 Procedural Settlement & Dungeon Floorplan Builder
- **Endpoint**: `POST /api/maps/generate-settlement`
  - Accepts `{ name, map_type, grid_size, world_id }`
  - Returns `{ mapId, name, map_type, gridWidth, gridHeight, rooms: [{ id, name, type, x, y, w, h, description }] }`
- **UI Elements**: Canvas floorplan renderer, interactive room click inspection, 1-click auto-create sub-articles for rooms.

---

## 2. Verification & Testing Strategy

1. **Automated Integration Tests (`test/api-suite.js`)**:
   - Test `POST /api/simulation/generate-rumors` returns d100 rumor table and broadsheet story.
   - Test `POST /api/maps/generate-settlement` returns procedural grid floorplan layout.
   - Test Zen mode controller functions initialization.
2. **Empirical Verification**: Run `npm test` and confirm 100% green execution.
