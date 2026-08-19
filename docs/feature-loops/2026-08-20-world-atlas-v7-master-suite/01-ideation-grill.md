# Stage 1: Persona Ideation & Initial Grilling
**Feature**: World Atlas v7 Master Suite: Spatial Pin Auto-Clustering, VTT Character Tokens & Faction Control Heatmap
**Date**: 2026-08-20
**Feature Loop Directory**: `docs/feature-loops/2026-08-20-world-atlas-v7-master-suite/`

---

## 👥 Persona Panel & Master Objectives

1. **Spatial Pin Auto-Clustering Engine** (Riley & Maya):
   - Group overlapping pins into cluster badges (`[5 Locations]`) when zoomed out, expanding smoothly on zoom-in.
2. **VTT Character Token Layer & Vision Radii** (Alex & Ethen):
   - Place active character tokens on map canvas with vision radii (e.g. 60ft Darkvision) and torchlight glows.
3. **Spatial Faction Control Heatmap & Territory Pressure Gauge** (Arthur & Morgan):
   - Render faction control gradient heatmaps and disputed border friction indicators across kingdom territories.

---

## 🔍 Arthur's 5-Whys Interrogation & Architecture Guarantees

1. **How does Spatial Pin Auto-Clustering function without breaking custom pin icons?**
   - When distance between pins in screen space is < 40px, group them into a cluster marker `L.divIcon({ className: 'atlas-pin-cluster', html: '<div class="cluster-badge">N</div>' })`. Clicking pans and zooms to expand cluster.
2. **How does VTT Character Token Layer work?**
   - Add token layer `map_character_tokens` allowing DMs to drag character avatar tokens onto battlemaps/world maps with customizable vision radius circles.
3. **How does Faction Heatmap function?**
   - Uses `checkTerritoryIntersections()` and faction colors to render semi-transparent gradient overlays over territory polygons.

---

**Ideation Verdict**: APPROVED BY ARTHUR VANCE & PERSONA PANEL. Proceeding to Stage 2 (Design Spec).
