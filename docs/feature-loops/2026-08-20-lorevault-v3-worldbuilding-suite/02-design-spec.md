# Stage 2: Design Spec & Gap Remediation Loop
**Feature**: LoreVault v3 Worldbuilding Suite: Visual Lore Knowledge Graph, Relationship Matrix & AI World Simulator
**Date**: 2026-08-20
**Feature Loop Directory**: `docs/feature-loops/2026-08-20-lorevault-v3-worldbuilding-suite/`

---

## 🛠️ Technical Design Specification

### 1. Visual Lore Knowledge Graph Engine (`public/js/lore-graph.js` & `public/index.html`)
- **Canvas Node Engine**:
  - Class `LoreGraphEngine` in `public/js/lore-graph.js`.
  - Node properties: `{ id, label, category, color, x, y, vx, vy, radius }`.
  - Edge properties: `{ source, target, label }` extracted from `@Link` tags.
  - Interactive handlers: Drag nodes, click node to open article drawer, zoom/pan canvas.
  - Tab integration: `🕸️ Lore Graph` navigation tab in `public/index.html`.

### 2. Character Relationship Matrix & Faction Web (`server.js` & `public/js/relationships-view.js`)
- **REST Endpoints**:
  - `GET /api/worlds/:worldId/relationships` (Returns all relationships).
  - `POST /api/relationships` (Creates or updates relationship record).
- **UI Grid Matrix Component**:
  - Matrix table matching Character A vs Character B with sentiment badge (`+80 Allied 🤝`, `-50 Enemy ⚔️`).
  - Click any cell to edit relationship type, sentiment score, and summary notes.

### 3. AI World Simulator & Epoch Generator (`server.js`)
- **REST Endpoint `POST /api/ai/simulate-epoch`**:
  - Input: `{ world_id, years_skipped, custom_directive }`.
  - Output: `{ success: true, events: [ { title, year, summary, impact } ], relationship_shifts: [ ... ] }`.
  - Auto-inserts events into `timeline_events` table in SQLite!

---

## 🔍 Arthur's Line-by-Line Spec Interrogation

- **Arthur**: *"Maya, how does the canvas graph handle 100+ articles without lagging?"*
- **Maya**: *"Force-directed iterations stop once velocity stabilizes, and rendering uses standard HTML5 Canvas 2D `requestAnimationFrame` with viewport clipping."*
- **Arthur**: *"Grant, what if Gemini fails during epoch simulation?"*
- **Grant**: *"We fall back to procedural epoch generation creating historical timeline events based on active faction relationship types!"*

---

**Gate 1 Verdict**: APPROVED BY ARTHUR VANCE & TEAM. Proceeding to Stage 3 (Implementation Plan).
