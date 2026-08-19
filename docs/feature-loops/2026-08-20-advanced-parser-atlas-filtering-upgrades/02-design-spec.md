# Stage 2: Design Specification & Architecture

**Feature Title**: Advanced WorldAnvil Parser Tags, Map Pin Filtering & View Refinements
**Date**: 2026-08-20
**Mode**: Autonomous Fast-Track (`--auto`)

---

## 1. Technical Architecture & Component Upgrades

### Fix 1: Collapsible Spoilers & Stat Boxes in `public/js/wa-parser.js`
- `[spoiler=Title]content[/spoiler]` ➔ `<details class="wa-spoiler"><summary class="wa-spoiler-summary">Title</summary><div class="wa-spoiler-body">content</div></details>`
- `[box=Title]content[/box]` ➔ `<div class="wa-box"><h4 class="wa-box-title">Title</h4><div class="wa-box-body">content</div></div>`

### Fix 2: Atlas Map Pin Category Filtering (`public/js/atlas-view.js`)
- Add `#atlas-pin-filter-bar` to `#atlas-view-container`.
- Filter Leaflet markers in `AtlasView.prototype.renderPins()` based on selected category (`all`, `city`, `fortress`, `lore`, `dungeon`).

### Fix 3: Relationship Matrix Status Filtering (`public/js/relationship-view.js`)
- Add status filter chips (`All`, `Allied`, `Hostile`, `Tense`, `Secret`) to `RelationshipView.prototype.renderMatrix()`.

### Fix 4: Timeline Event Category Filtering (`public/js/timeline-view.js`)
- Add category filter chips to `TimelineView.prototype.renderTimeline()`.

---

## 2. Arthur's Design Interrogation & Gate 1 Auto-Pass

> **Arthur**: *"Does `WAParser.parse` handle nested BBCode inside `[spoiler]` or `[box]` containers cleanly?"*
> 
> **Alex (Dev)**: *"Yes. Spoilers and boxes are parsed early in the parser pipeline so their inner contents undergo full heading, table, and cross-link tag expansion."*

**Arthur's Verdict**: PASSED (Auto-Approved for Stage 3).
