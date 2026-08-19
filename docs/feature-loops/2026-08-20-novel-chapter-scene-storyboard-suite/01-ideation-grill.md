# Stage 1: Persona Ideation & Initial Grilling
**Feature**: Novel Chapter & Scene Location Storyboard Suite
**Date**: 2026-08-20
**Feature Loop Directory**: `docs/feature-loops/2026-08-20-novel-chapter-scene-storyboard-suite/`

---

## 👥 Persona Team & Feature Objectives

- 👔 **Ethen (PO)**: "The Storyboard Suite bridges the gap between LoreVault's writing tools and cartography. Novelists and worldbuilders can tag map pins to specific chapters, visualize character movement across scenes, and see which characters and factions are present at each location during a given chapter!"
- 🎭 **Elena (Novelist)**: "As an author, I want to filter the map by `Chapter 1`, `Chapter 2`, or `Chapter 3` to see where my characters are physically located, draw character travel arcs across chapters, and click a location pin to open its active scene slate in the Weave Matrix!"
- 🎨 **Maya (Lead UI/UX)**: "We need a clean header bar `#atlas-storyboard-bar` with chapter selection chips, a `📍 Tag to Scene Slate` button in the pin drawer, and a `📖 Chapter View` toggle."
- 🧪 **Riley (QA Lead)**: "Zero broken relations. If a scene or chapter is deleted, pins gracefully drop the chapter tag without deleting the map pin or location article."
- 🔍 **Arthur "The Griller" Vance (Socratic Architect)**: "Let's grill this down. How do we store chapter-location relationships? How does this integrate with the existing `scenes` and `slates` tables in SQLite? And how do we ensure authors can export chapter travel maps into standalone HTML or Markdown?"

---

## 🔍 Arthur's 5-Whys Interrogation & Architecture Guarantees

1. **How are scene locations linked to map pins?**
   - In SQLite table `map_pins`, add column `scene_id TEXT` and `chapter_num INTEGER`.
2. **How does the Storyboard Bar function?**
   - `#atlas-storyboard-bar` lists all chapters (`All`, `Ch 1`, `Ch 2`, `Ch 3`...). Selecting `Ch 2` highlights pins tagged to Chapter 2 and draws a polyline path connecting Chapter 2 scene locations in chronological order.
3. **How does this integrate with the Weave Matrix?**
   - Pin drawer features a 1-click button `[🎬 Open Scene Slate in Weave Matrix]`, loading the location's character cast, lore notes, and timeline events into the writer's editor.

---

**Ideation Verdict**: APPROVED BY ARTHUR VANCE & PERSONA PANEL. Proceeding to Stage 2 (Design Spec).
