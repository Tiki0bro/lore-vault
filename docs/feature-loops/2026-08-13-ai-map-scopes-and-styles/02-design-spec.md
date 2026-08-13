# Feature Loop Stage 2: Design Spec & Gap Remediation
**Feature**: AI Map Scope Presets, Aesthetic Style Presets, & Automatic Scale Calibration
**Date**: 2026-08-13
**Mode**: Autonomous Fast-Track (--auto)
**Status**: Stage 2 Design Spec Approved (Arthur Socratic Pass)

---

## 1. AI Map Scope Presets Roster

1. 🌍 **world**: Continental scope, vast oceans, empires, mountain ranges. (`scale_unit: 'miles'`, `scale_pixels: 100`, `scale_distance: 100`)
2. 🗺️ **region**: Province / kingdom scale, trade roads, rivers, local fortresses. (`scale_unit: 'miles'`, `scale_pixels: 100`, `scale_distance: 25`)
3. 🏰 **city**: Urban settlement, district walls, cobblestone streets, harbor docks. (`scale_unit: 'feet'`, `scale_pixels: 100`, `scale_distance: 500`)
4. 🏘️ **town**: Rural village, farmlands, tavern, blacksmith, treeline. (`scale_unit: 'feet'`, `scale_pixels: 100`, `scale_distance: 100`)
5. 📜 **treasure**: Weathered parchment, X-marks-the-spot, trail path, sea monster. (`scale_unit: 'miles'`, `scale_pixels: 100`, `scale_distance: 5`)
6. ⚔️ **battlemap**: Top-down tactical encounter layout, 5ft grid lines, ruins, glade. (`scale_unit: 'feet'`, `scale_pixels: 100`, `scale_distance: 5`)

---

## 2. Aesthetic Style Presets Roster

1. 📜 **sepia**: Hand-inked cartography, vintage sepia parchment paper, mountain hatching.
2. 🎨 **codex**: Full-color fantasy watercolor, emerald forests, sapphire waters, gold compass.
3. 🗡️ **grimdark**: Dark charcoal & ash tones, dark granite terrain, obsidian rivers.
4. 📐 **blueprint**: Architectural layout linework, grid overlay, crisp monochrome.

---

## 3. Modal UI & REST API Integration

- **UI (`public/js/atlas-view.js`)**:
  - Add 6 Scope Cards (`.gen-scope-card`) and 4 Style Chips (`.gen-style-chip`) to `#gen-ai-settings`.
  - On submit, send `map_scope` and `map_style` in `FormData` to `POST /api/maps/generate/ai` or `POST /api/maps/generate/procedural`.
- **Backend (`server.js`)**:
  - Update `handleProceduralMapGeneration` and AI endpoint to read `req.body.map_scope` and `req.body.map_style`.
  - Automatically assign appropriate `scale_unit`, `scale_pixels`, and `scale_distance` in SQLite `maps` table based on `map_scope`.
  - Dynamically construct AI prompt string using scope & style directives.
