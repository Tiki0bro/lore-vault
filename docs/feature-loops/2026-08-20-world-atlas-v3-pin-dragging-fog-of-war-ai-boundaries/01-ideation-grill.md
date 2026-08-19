# Stage 1: Persona Ideation & Initial Grilling
**Feature**: World Atlas v3: Interactive Pin Dragging, Fog of War Discovery Canvas & AI Auto-Territory Tracing
**Date**: 2026-08-20
**Feature Loop Directory**: `docs/feature-loops/2026-08-20-world-atlas-v3-pin-dragging-fog-of-war-ai-boundaries/`

---

## 👥 Persona Panel & Feature Objectives

- 👔 **Ethen (PO)**: "World Atlas v3 elevates LoreVault into a professional VTT-grade mapping suite. DMs can drag pins on the canvas to recalibrate location coordinates instantly, brush away dark Fog of War to reveal new lands to players, and convert map coastlines/borders into interactive Leaflet territories with 1 click!"
- 🎨 **Maya (Lead UI/UX)**: "We need three intuitive toolbar additions: a `🧲 Pin Lock/Drag Toggle` for canvas pin dragging, a `🌫️ Fog of War Brush Tool` with size/opacity controls, and an `🤖 Auto-Trace Territory` button in the Layer Manager."
- 🎭 **Alex (VTT Specialist)**: "Pin dragging must update `x_pct` and `y_pct` in Leaflet marker `dragend` events and issue `PUT /api/map-pins/:id` API updates seamlessly. Fog of War requires an HTML5 canvas overlay synced with Leaflet pan/zoom."
- 🧪 **Riley (QA Lead)**: "In Public Player View, Fog of War pixels must obscure hidden map tiles and secret pins (`is_secret = 1`). DM Canon View lets DMs toggle Fog opacity."
- 🔍 **Arthur "The Griller" Vance (Socratic Architect)**: "Let's grill the architecture! How do we ensure dragging pins doesn't accidentally trigger pin-click detail modals? How does Fog of War persist across sessions? And how does AI Auto-Tracing handle complex coastlines without choking Leaflet rendering performance?"

---

## 🔍 Arthur's 5-Whys Interrogation & Architecture Guarantees

1. **How do we prevent pin dragging from opening the pin detail modal?**
   - In Leaflet, dragging fires both `dragstart`/`dragend` and a `click` event. We set a `isDraggingPin` flag on `dragstart` and suppress click handler execution if `isDraggingPin` is true.
2. **How is Fog of War saved in SQLite?**
   - Fog of War state is stored in SQLite table `map_fog_states` (`map_id`, `fog_data_url` or `fog_mask_json`) so DM edits persist across sessions and export cleanly in offline HTML atlas bundles.
3. **How does AI Boundary Auto-Tracing operate?**
   - `POST /api/maps/:mapId/ai-auto-boundaries` analyzes map image contrast/color channels or queries Gemini Multimodal Vision API to detect kingdom borders and coastlines, returning GeoJSON polygon vertices ready for `L.Polygon` rendering.

---

**Ideation Verdict**: APPROVED BY ARTHUR VANCE & PERSONA PANEL. Proceeding to Stage 2 (Design Spec).
