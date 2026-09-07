# Stage 1 & Stage 2: Ideation Grill & Design Spec — Timeline Anachronism Auditor

**Feature**: Analytical Timeline Anachronism & Character Age Auditor  
**Date**: 2026-08-21  
**Author**: Arthur "The Griller" Vance & Persona Panel  

---

## 1. Persona Ideation & Socratic Grilling

### Persona Feedback:
- 🖋️ **Merryn Ashford (Craft Purist)**: "I need automated verification that flags when a character participates in an event before their birth or after their death."
- 🔍 **Arthur Vance**: "Strict analytical validation without generative prose guarantees timeline canon integrity."

### Arthur's Socratic Grill Pass:
> **Question**: How are birth/death dates extracted from articles?  
> **Answer**: Scans article content and timeline event metadata for birth/death tags or dates (e.g. `Birth: 104`, `Deceased: 180`). Compares event year against character lifespan.

---

## 2. Design Specification

### 2.1 Backend REST Endpoint `POST /api/timeline/anachronism-audit`
- Accepts `{ world_id }`.
- Compares timeline events against character lifespans.
- Returns `{ success: true, anachronisms: [], character_ages: [] }`.

### 2.2 UI Component (`public/js/timeline-view.js`)
- Button: `🔍 Scan Anachronisms & Character Ages`.
- Event Cards: Displays character age badges (e.g. `Roderick (Age 34)`) and red warning badges (`⚠️ ANACHRONISM`).
