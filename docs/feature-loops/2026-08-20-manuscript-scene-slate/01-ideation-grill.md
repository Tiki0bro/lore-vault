# Stage 1 & Stage 2: Ideation Grill & Design Spec — Manuscript Scene Slate

**Feature**: Manuscript Scene Slate & Chapter Beat Builder  
**Date**: 2026-08-20  
**Author**: Arthur "The Griller" Vance & Persona Panel  

---

## 1. Persona Ideation & Socratic Grilling

### Persona Feedback:
- 🎭 **Elena Rostova (Novelist)**: "I need my character notes and location lore side-by-side while drafting chapter prose, without switching tabs."
- 🖋️ **Merryn Ashford (Craft Purist)**: "The No-Generate consistency audit must highlight contradictions against my manuscript without auto-generating prose."

### Arthur's Socratic Grill Pass:
> **Question**: How is this different from the general Zen Reader mode?  
> **Answer**: Zen mode is for reading single articles. The Manuscript Slate is a dual-pane editor designed specifically for chapter drafting with pinned lore sidebars, POV metrics, and Tonal presets.

---

## 2. Design Specification

### 2.1 Backend SQLite Schema & REST Endpoints
- Table `lore_manuscripts` (`id TEXT PRIMARY KEY, world_id TEXT NOT NULL, title TEXT NOT NULL, chapter_number INTEGER DEFAULT 1, pov_character_id TEXT, prose_content TEXT, scene_beats TEXT, created_at DATETIME, updated_at DATETIME`).
- `GET /api/worlds/:worldId/manuscripts`: Returns chapter list.
- `POST /api/manuscripts`: Saves manuscript chapter.

### 2.2 UI Component (`#manuscript-slate-modal`)
- Dual-pane editor in `public/index.html`:
  - Left: Prose drafting textarea, POV badge, word count, reading time calculator.
  - Right: Pinned lore sidebar showing character stats, location details, and `@` cross-link hints.
- Top toolbar: `[📖 Pinned Lore]`, `[🔍 No-Generate Consistency Audit]`, `[💾 Save Chapter]`.
