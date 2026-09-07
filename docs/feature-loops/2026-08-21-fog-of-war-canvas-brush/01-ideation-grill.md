# Stage 1 & Stage 2: Ideation Grill & Design Spec — Fog-of-War Canvas Brush

**Feature**: Interactive Fog-of-War Canvas Brush & Sight Radius Layer  
**Date**: 2026-08-21  
**Author**: Arthur "The Griller" Vance & Persona Panel  

---

## 1. Persona Ideation & Socratic Grilling

### Persona Feedback:
- 🎭 **Alex Vance (VTT Dev)**: "DMs using LoreVault maps for live games need an interactive Fog-of-War layer to hide unexplored dungeon rooms from players."
- 🎨 **Maya Lin (UI/UX)**: "The brush controls must be simple: size slider, reveal/conceal toggle, clear button, and DM opacity slider."

### Arthur's Socratic Grill Pass:
> **Question**: How is fog data stored without bloating Leaflet map JSON files?  
> **Answer**: Fog is drawn on a 2D HTML5 canvas overlay and exported as a compact PNG data URL stored in SQLite `map_fog_states` (`map_id`, `fog_data_url`).

---

## 2. Design Specification

### 2.1 Backend SQLite Schema & REST Endpoints
- Table `map_fog_states` (`map_id TEXT PRIMARY KEY, fog_data_url TEXT NOT NULL, updated_at DATETIME`).
- `GET /api/maps/:mapId/fog`: Returns fog state.
- `POST /api/maps/:mapId/fog`: Saves fog data URL.

### 2.2 UI Integration (`public/js/atlas-view.js`)
- Fog brush toolbar: `[🖌️ Brush Size]`, `[🌫️ Conceal/Reveal]`, `[💾 Save Fog]`, `[🧹 Clear Fog]`.
- GM Mode (`?mode=gm`): 0.4 opacity. Player Mode (`?mode=player`): 1.0 opacity.
