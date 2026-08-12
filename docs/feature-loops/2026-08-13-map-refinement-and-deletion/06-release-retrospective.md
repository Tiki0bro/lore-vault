# Feature Loop Stage 6: Release Retrospective
**Feature**: Map Deletion, Targeted Article Context Generator, & Hand-Drawn Procedural Cartography Polish
**Date**: 2026-08-13
**Mode**: Autonomous Fast-Track (--auto)
**Status**: Feature Loop Complete & Released

---

## 1. Release Highlights

- **Map Deletion & Cascade Clean Up**: `DELETE /api/maps/:id` cascades deletion across `map_pins`, `map_territories`, `map_layers`, `map_routes`, and unlinks image files from disk. `[🗑️ Delete Map]` button added to toolbar.
- **Targeted Article Lore Selector**: `#atlas-generate-modal` now features a searchable multi-select article checklist so DMs pick specific vault articles to drive AI prompts and pin scattering.
- **Hand-Drawn Procedural Canvas Overhaul**: Upgraded `perlin-cartography.js` with mountain triangle stamps (`▲`), tree cluster icons (`🌲`), procedural river carving, paper grain textures, coastline ink stippling, and an intricate compass rose.

---

## 2. Key Decisions Logged in DECISIONS.md

- **Cascading Map Deletion**: Ensured unreferenced image files in `/uploads/images/` are unlinked when a map record is deleted.
- **Targeted Article Selection**: Filtered location article queries by user-selected article IDs to prevent prompt context bloat.
