# 01. Ideation & Initial Grilling: LoreVault Version 2

**Feature Title**: LoreVault Version 2 Suite (Multi-World Manager, Timeline Chronology Engine, Session Prep Slate)  
**Mode**: Autonomous Fast-Track Mode (`--auto`)  
**Date**: 2026-08-11  
**Status**: Stage 1 Complete

---

## 👥 Persona Ideation Summary

- 👔 **Ethen (PO)**: LoreVault Version 2 elevates LoreVault from a single-world tool into a multi-world publishing platform for authors, GMs, and worldbuilders.
- 🎭 **Morgan (World Anvil GM)**: Demands a dedicated **Timeline Chronology Engine** (`timeline_events` table) to track historical epochs, battle dates, and character lifespans.
- 🎭 **Elena (Novelist)**: Demands a **Multi-World Vault Manager** so authors can switch between distinct book series settings without mixing lore.
- 🎨 **Maya (UI/UX)**: Demands a clean top navbar dropdown switcher and dedicated Timeline tab view.
- 🧪 **Riley (QA Lead)**: Demands zero database corruption during world switching and atomic foreign key cascades.

---

## 👓 Arthur "The Griller" Vance's Stage 1 Interrogation

### Probe 1: Database Isolation & Stale Memory Leak
* **Arthur**: "When a user switches from World A to World B, how do you prevent local state memory leaks in `app.js`? If `window.app.articles` still holds World A entries when rendering World B's atlas or library, private DM lore leaks across worlds!"
* **Alex (Dev Lead)**: "Every world switch executes `window.app.resetActiveState()`, clearing `articles`, `maps`, `frontpage`, and `contextBuilder` state arrays before performing a clean REST payload fetch (`GET /api/worlds/:worldId/articles`)."

### Probe 2: Timeline Chronology Date Parsing Nightmare
* **Arthur**: "Fantasy worlds don't use 2026 AD dates. They use custom calendars (e.g. *Age of Ashes, Year 142* or *Post-Shattering 302*). How does your timeline sort events without breaking on non-standard date strings?"
* **Alex (Dev Lead)**: "We store a normalized numeric sorting key `sort_order` (float/int) alongside human-readable epoch strings (`epoch_name` and `display_year`). Sorting is executed strictly on `sort_order`, supporting any custom calendar system!"

---

## 🏁 Arthur's Stage 1 Verdict
**Pass with Socratic Remediation**. Proceed to `02-design-spec.md`.
