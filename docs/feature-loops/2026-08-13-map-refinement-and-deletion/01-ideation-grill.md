# Feature Loop Stage 1: Persona Ideation & Initial Grilling
**Feature**: Map Deletion, Targeted Article Context Generator, & Hand-Drawn Procedural Cartography Polish
**Date**: 2026-08-13
**Mode**: Autonomous Fast-Track (--auto)
**Status**: Stage 1 Ideation & Grilling Complete

---

## 1. Feature Intent & Problem Statement

Users experienced 3 major usability and aesthetic gaps in World Atlas v2:
1. **No Map Deletion**: No way to remove unwanted, duplicate, or test maps from the atlas dropdown without running manual SQL queries.
2. **Unpolished Procedural Canvas**: The Perlin noise generator produced flat color blobs that looked like unpolished heatmaps rather than hand-crafted fantasy maps.
3. **Overloaded AI & Pin Context**: Auto-generation used *all* 50+ vault location articles, overloading AI prompts and scattering 20+ pins randomly across the map without user selection.

---

## 2. Arthur's Interrogation & Socratic Grilling

#### 🔍 Question 1: Map Deletion & Database Cascading
> **Arthur**: *"If a DM deletes a map, what happens to linked pins, territories, custom layers, routes, and image files on disk?"*
> **Alex**: *"Executing `DELETE /api/maps/:mapId` will trigger a clean SQLite transaction that deletes associated `map_pins`, `map_territories`, `map_layers`, and `map_routes`, and unlinks image files from `/uploads/images/` if not shared by another map."*

#### 🔍 Question 2: Hand-Drawn Cartography Aesthetics
> **Arthur**: *"How do we make procedural maps look like authentic fantasy cartography instead of flat elevation blobs?"*
> **Maya**: *"We upgrade `perlin-cartography.js` to render paper grain textures, coastline ink stippling (`:::`), 4 concentric ocean ripple rings, procedural river carving from peaks to coastlines, hand-drawn vector mountain triangle stamps (`▲`), and tree cluster icons (`🌲`)."*

#### 🔍 Question 3: Targeted Article Selection
> **Arthur**: *"How do we fix AI prompt context overload and random pin scattering?"*
> **Morgan**: *"In `#atlas-generate-modal`, we add a searchable multi-select checklist of vault articles. DMs explicitly pick 2–5 target articles (e.g. `☑️ Kingdom of Valoria`, `☑️ Frostpeak Range`). Only selected articles drive AI map generation and pin placement!"*
