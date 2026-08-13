# Feature Loop Stage 3: Implementation Plan
**Feature**: AI Map Scope Presets, Aesthetic Style Presets, & Automatic Scale Calibration
**Date**: 2026-08-13
**Mode**: Autonomous Fast-Track (--auto)
**Status**: Stage 3 Implementation Plan Approved (Arthur Socratic Pass)

---

## Task Breakdown

### Task 1: UI Scope Cards & Style Chips in Generator Modal
- Modify: `public/js/atlas-view.js` & `public/css/styles.css`
- Render 6 Scope Cards (`World`, `Region`, `City`, `Town`, `Treasure`, `Battlemap`) and 4 Aesthetic Style Chips (`Sepia`, `Codex`, `Grimdark`, `Blueprint`).
- Bind click selection events and send `map_scope` & `map_style` in `FormData`.

### Task 2: Backend Prompt Generator & Scale Metrics Calibration
- Modify: `server.js`
- Read `map_scope` and `map_style` in map generation endpoints.
- Auto-set SQLite `scale_unit`, `scale_pixels`, and `scale_distance` according to scope.
- Build dynamic AI prompt string with scope directives and negative prompt constraints.

### Task 3: Automated Verification
- Create: `scratch/test-ai-map-scopes.js`
- Test scope selection, prompt construction, scale calibration in SQLite, and API responses.
