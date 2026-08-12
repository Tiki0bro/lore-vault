# Feature Loop Stage 3: Implementation Plan
**Feature**: Map Deletion, Targeted Article Context Generator, & Hand-Drawn Procedural Cartography Polish
**Date**: 2026-08-13
**Mode**: Autonomous Fast-Track (--auto)
**Status**: Stage 3 Implementation Plan Approved (Arthur Socratic Pass)

---

## Task Breakdown

### Task 1: Map Deletion REST Endpoint & Toolbar Action
- Modify: `server.js` (Implement `DELETE /api/maps/:mapId`)
- Modify: `public/js/atlas-view.js` & `public/css/styles.css` (Add `#atlas-delete-map-btn` and delete handler)
- Test: `scratch/test-map-deletion.js`

### Task 2: Targeted Article Lore Selector & AI Prompt Refinement
- Modify: `public/js/atlas-view.js` (Add article picker checklist in `#atlas-generate-modal`)
- Modify: `server.js` (Update `POST /api/maps/generate/procedural` and `POST /api/maps/generate/ai` to filter target articles)
- Test: `scratch/test-targeted-article-gen.js`

### Task 3: Hand-Drawn Procedural Canvas Overhaul
- Modify: `public/js/perlin-cartography.js` (Add paper grain texture, coastline ink ripples, mountain peak stamps `▲`, tree cluster stamps `🌲`, river paths, and compass rose)
- Test: `scratch/test-hand-drawn-cartography.js`
