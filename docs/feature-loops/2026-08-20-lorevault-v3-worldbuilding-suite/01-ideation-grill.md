# Stage 1: Persona Ideation & Initial Grilling
**Feature**: LoreVault v3 Worldbuilding Suite: Visual Lore Knowledge Graph, Relationship Matrix & AI World Simulator
**Date**: 2026-08-20
**Feature Loop Directory**: `docs/feature-loops/2026-08-20-lorevault-v3-worldbuilding-suite/`

---

## 👥 Persona Team & Master Objectives

1. **Visual Lore Knowledge Graph & Dynamic Concept Canvas** (Maya & Morgan):
   - Interactive node-graph view (`#lore-graph-canvas`) connecting articles, factions, characters, and locations with force-directed layouts and `@Link` edge connections.
2. **Character Relationship Matrix & Faction Web Engine** (Arthur & Ethen):
   - 2D grid matrix and sentiment editor mapping character & faction alliances, rivalries, and family lineage trees.
3. **AI World Simulator & Campaign Event Generator** (Grant & Elena):
   - Epoch simulator (`+1 Year`, `+5 Years`, `+10 Years`) querying Gemini AI to generate major historical events, auto-appending `timeline_events` rows and updating faction relationship scores.

---

## 🔍 Arthur's 5-Whys Interrogation & Architecture Guarantees

1. **How does the Visual Lore Knowledge Graph render without heavy external NPM packages?**
   - Built with a lightweight HTML5 Canvas 2D force-directed node engine (`public/js/lore-graph.js`), calculating spring repulsion between article nodes and drawing edge links for cross-references (`@Title`).
2. **How is the Character Relationship Matrix persisted?**
   - SQLite table `entity_relationships` (`id, world_id, source_entity_id, source_entity_title, target_entity_id, target_entity_title, relationship_type, sentiment_score, summary`).
3. **How does the AI World Simulator execute?**
   - REST endpoint `POST /api/ai/simulate-epoch` queries Gemini AI with active world articles, factions, and relationships, returning 3 timeline events and sentiment shifts.

---

**Ideation Verdict**: APPROVED BY ARTHUR VANCE & PERSONA PANEL. Proceeding to Stage 2 (Design Spec).
