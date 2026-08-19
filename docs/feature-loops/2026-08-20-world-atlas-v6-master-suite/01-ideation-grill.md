# Stage 1: Persona Ideation & Initial Grilling
**Feature**: World Atlas v6 Master Suite: Map Pin Hover Cards, Chapter Storyboard Filter & AI Spatial Lore Auto-Expander
**Date**: 2026-08-20
**Feature Loop Directory**: `docs/feature-loops/2026-08-20-world-atlas-v6-master-suite/`

---

## 👥 Persona Panel & Objectives

1. **Map Pin Hover Cards & Lore Quick-Preview Popups** (Morgan & Maya):
   - Rich glassmorphic tooltip hover cards (`#atlas-hover-card`) showing thumbnail image, category badge, and summary paragraph without opening full side drawers.
2. **Novel Chapter Location Storyboard Filter** (Elena & Ethen):
   - Filter map pins by chapter (`#atlas-chapter-filter`) and render chronological chapter sequence lines connecting locations in story order.
3. **AI Spatial Lore Auto-Expander for Unexplored Regions** (Grant & Alex):
   - Right-click empty map coordinates to invoke `[✨ AI Explore Unexplored Region]`, querying Gemini AI to generate 3 location seeds and pins!

---

## 🔍 Arthur's 5-Whys Interrogation & Architecture Guarantees

1. **How do Pin Hover Cards render efficiently without DOM bloat?**
   - We construct Leaflet `bindTooltip` HTML strings lazily on mouseover, fetching summary snippets and thumbnails directly from the in-memory `this.articles` cache.
2. **How does Chapter Storyboard Filtering operate?**
   - Pins linked to location articles with tagged scene/chapter metadata are filtered by `#atlas-chapter-filter`. Chronological polyline sequence paths connect locations across the chapter sequence.
3. **How does AI Spatial Lore Auto-Expander work?**
   - Endpoint `POST /api/ai/explore-region` receives `{ x_pct, y_pct, world_id, map_title }` and queries Gemini AI for 3 localized lore seeds (dungeon, ruin, sanctuary), offering 1-click creation.

---

**Ideation Verdict**: APPROVED BY ARTHUR VANCE & PERSONA PANEL. Proceeding to Stage 2 (Design Spec).
