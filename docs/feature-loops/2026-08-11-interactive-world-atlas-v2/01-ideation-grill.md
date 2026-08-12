# Feature Loop Stage 1: Ideation & Initial Grilling
**Feature**: Interactive World Atlas v2 (Nested Maps, Distance Scale Ruler, Pin Search/Filtering & Expedition Paths)
**Date**: 2026-08-11
**Status**: Stage 1 Complete (Auto-advanced to Stage 2)

---

## 1. Feature Overview & Scope

Version 2 of LoreVault's Interactive World Atlas extends our v1 foundation (Territory Polygons, Custom Layers, Contested Zones, and Gemini Vision Auto-Cartography) with 4 major additions:

1. **Nested Sub-Maps ("Drill-Down Zoom")**:
   - Link pins on a high-level world map to child maps (e.g. *World Map $\rightarrow$ Kingdom Map $\rightarrow$ City Blueprint $\rightarrow$ Dungeon Floor Plan*).
   - Viewport Breadcrumb Navigation (`World of Aethelgard > Kingdom of Valoria > Oakhaven City`).
2. **Distance Scale Ruler & Travel Calculator**:
   - Map scale calibration ($100\text{px} = N\text{ miles / km / leagues}$).
   - Click-and-drag measuring tape tool with travel time estimates (on foot, horseback, sailing).
3. **Pin Filtering, Search & Category Chips**:
   - Live search input to highlight and auto-zoom to map pins.
   - Category filter chips (*Settlements, Fortresses, Dungeons, Danger Zones, Relics*).
4. **Expedition Path & Route Drawing**:
   - Polyline route drawing connecting pins to trace party movements and trade routes with distance totals.

---

## 2. Persona Alignment Matrix

| Persona | Core Request / Goal for Atlas v2 | Key Concern / Constraint |
|---|---|---|
| 👔 **Ethen (PO)** | Seamless drill-down experience with zero UI bloat | Scope management; avoid over-complicating toolbar |
| 🧪 **Riley (QA)** | Robust coordinate math and zero broken child map links | Hierarchy loops (e.g. Map A linking to Map B linking back to Map A) |
| 🎭 **Alex (Dev/VTT)** | Clean foreign keys in SQLite for parent/child map relations | Normalized schema and fast rendering of distance polylines |
| 🎭 **Morgan (World Anvil)** | Full hierarchy navigation for 500+ setting locations | Breadcrumbs and fast switching between regional and city maps |
| 🎨 **Maya (UI/UX)** | Glassmorphic breadcrumb bar and sleek ruler tool overlay | Responsive controls without viewport clipping or drawer overlap |
| 🤖 **Grant (AI Novelist)** | AI travel route generator (*"Suggest safest path between Citadel & Ruins"*) | Model fallback safety and clean JSON prompt formatting |
| 🖋️ **Merryn (Craft Purist)** | Manual ruler calibration without forced AI estimation | Strict analytical distance metrics without auto-generated prose |
| 📢 **Marcus (Marketing)** | Standalone HTML exporter bundling full sub-map tree | Export bundle size and public player safety |

---

## 3. 🔥 Arthur "The Griller" Vance's Initial Interrogation

> *"Before we write a single line of code for Atlas v2, we must stress-test the architectural assumptions."*

### Interrogation 1: Nested Map Recursion & Hierarchy Loops
**Arthur**: *"If a pin on Map A links to Map B, and a pin on Map B links back to Map A, what happens to the breadcrumb navigation stack and Leaflet canvas state? How do we prevent infinite stack loops?"*
- **Resolution**: Map hierarchy paths are computed dynamically per navigation session using a breadcrumb stack array `[rootMap, parentMap, currentMap]`. Cyclic link detection halts recursion and replaces circular links with a quick *"Return to parent map"* action.

### Interrogation 2: Scale Ruler Calibration Storage
**Arthur**: *"Maps come in different image pixel sizes. How is scale stored, and what happens when a map image is re-uploaded with higher resolution?"*
- **Resolution**: Scale is stored as `scale_pixels` (float) to `scale_distance` (float) + `scale_unit` (`miles`, `km`, `leagues`). Distance calculations normalize pixel distances relative to the map image width `(pixel_dist / image_width)`, ensuring scale calibration remains accurate even if the display window resizes.

### Interrogation 3: Standalone Exporter Tree Size
**Arthur**: *"If a world has 10 nested sub-maps, does the Standalone HTML exporter bundle all 10 map images, or only the active map? What happens to the file size?"*
- **Resolution**: The HTML exporter bundles the metadata for all sub-maps in the world tree, while embedding base64 image data for active maps up to a 50MB safety ceiling, with fallbacks to relative image paths.
