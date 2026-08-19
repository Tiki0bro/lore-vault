# Stage 1: Persona Ideation & Initial Grilling
**Feature**: World Atlas v4 Master Suite: Sub-Map Teleportation, Spatial Minimap Radar & Category Legend, Animated Party Travel Token
**Date**: 2026-08-20
**Feature Loop Directory**: `docs/feature-loops/2026-08-20-world-atlas-v4-master-suite/`

---

## 👥 Persona Team & Master Suite Objectives

1. **Sub-Map Teleportation & Battlemap Drill-Down** (Ethen & Alex):
   - Add `[🗺️ Teleport to Sub-Map]` and `[⚔️ Generate Battlemap]` action buttons inside pin detail drawers and pin context popups.
2. **Glassmorphic Spatial Minimap Radar & Category Legend Panel** (Maya & Morgan):
   - Add floating corner minimap `#atlas-minimap` showing full map thumbnail & active viewport reticle.
   - Add collapsible `#atlas-legend-panel` with category toggles (Settlements, Fortresses, Dungeons, Natural Wonders) & live pin counters.
3. **Animated Party Travel Token & Random Encounter Simulator** (Alex & Riley):
   - Add `[▶️ Play Travel Animation]` button on expedition routes (`map_routes`) animating a party marker icon along route polylines with terrain travel speed math and D20 encounter checks!

---

## 🔍 Arthur's 5-Whys Interrogation & Root Value Analysis

1. **Why build all 3 features in World Atlas v4?**
   - Together, these 3 features transform LoreVault into a complete, professional VTT mapping suite—providing hierarchical map navigation, spatial orientation, and interactive session play!
2. **How does Sub-Map Teleportation function?**
   - Clicking `[🗺️ Teleport to Sub-Map]` queries `target_sub_map_id` on the pin and calls `loadMap(targetSubMapId)`, updating breadcrumbs and Leaflet viewport seamlessly.
3. **How does Spatial Minimap Radar operate?**
   - `#atlas-minimap` overlays a miniature thumbnail of the current map image with a SVG/HTML viewport box reflecting Leaflet map bounds. Clicking anywhere on the minimap pans the main viewport instantly.
4. **How does Animated Party Travel work?**
   - Clicking `[▶️ Play Travel]` interpolates latitude/longitude coordinates along `map_routes` polylines using `requestAnimationFrame`, moving a party token icon with live distance math (miles/km, travel days, D20 encounter prompts).

---

**Ideation Verdict**: APPROVED BY ARTHUR VANCE & PERSONA PANEL. Proceeding to Stage 2 (Design Spec).
