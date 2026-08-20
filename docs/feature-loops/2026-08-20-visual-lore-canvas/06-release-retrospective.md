# Stage 6: Release Retrospective & Decision Memory
**Feature**: Visual Lore Canvas & Spatial Mindmap (`visual-lore-canvas`)  
**Date**: 2026-08-20  
**Status**: FEATURE RELEASED COMPLETE

---

## 1. Architectural Decisions Summary
- **Storage Strategy**: Created `lore_canvas_positions` SQLite table storing normalized float coordinates `(pos_x, pos_y)` with `ON DELETE CASCADE` foreign keys.
- **Frontend Architecture**: Built `CanvasView` component in `public/js/canvas-view.js` managing SVG path curves, interactive node cards, pan/zoom viewports, and layout preset algorithms (`grid`, `circle`, `timeline`).

---

## 2. Key Learnings & Post-Mortem
- Mouse event drag listeners must calculate relative viewport zoom scaling (`(mouseX - offset) / zoomLevel`) to prevent card jumping during zoom states.
