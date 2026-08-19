# Stage 3: Implementation Plan & Team Validation
**Feature**: Visual Lore Canvas & Spatial Mindmap (`visual-lore-canvas`)  
**Date**: 2026-08-20  
**Status**: Gate 2 Passed (Arthur Socratic Pass - Auto Mode)

---

## 1. Step-by-Step Task Breakdown

1. **Database Schema & Backend REST APIs** (`server.js`):
   - Add `lore_canvas_positions` table creation in `initDatabase()`.
   - Add `GET /api/worlds/:worldId/canvas-nodes` endpoint.
   - Add `POST /api/canvas/positions` endpoint for position persistence.
   - Add `POST /api/canvas/auto-layout` endpoint with force-directed grid calculation.
2. **Frontend Canvas View Component** (`public/js/canvas-view.js`):
   - Create `CanvasView` class managing zoom/pan viewport, node dragging, SVG edge rendering, and layout presets.
   - Attach event listeners and hook into `LoreEvents` event bus.
3. **UI Markup & Styles** (`public/index.html` & `public/css/styles.css`):
   - Add `#view-canvas` navigation tab button and view container.
   - Add styling for `.canvas-node-card`, `.canvas-toolbar`, and SVG edge lines.
4. **Automated Integration Tests** (`test/api-suite.js`):
   - Add unit tests verifying `GET /api/worlds/:worldId/canvas-nodes`, `POST /api/canvas/positions`, and `POST /api/canvas/auto-layout`.

---

## 2. Arthur's Gate 2 Socratic Check
- **Interrogation**: "Have you ensured the auto-layout API handles empty worlds gracefully without dividing by zero?"
- **Remediation**: Guard condition added to auto-layout algorithm returning early if node count is 0.
- **Verdict**: APPROVED FOR EXECUTION.
