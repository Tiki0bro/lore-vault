# 02 - TTRPG Stat Block Engine Improvements Design Specification

## Feature Title: TTRPG Stat Block Engine Improvements (Interactive Dice Roller, VTT Exporters, Bestiary Index & Article Embeds)
**Date**: 2026-08-20  
**Feature Loop Directory**: `docs/feature-loops/2026-08-20-ttrpg-statblock-improvements/`

---

## 1. System Components & Architecture

### A. Interactive Dice Roller Engine (`public/js/app.js`)
* **Clickable Stat Cards**: Attack bonuses (`+6 to hit`), saving throw modifiers (`Con +5`), and damage dice (`2d8+3 slashing`) in rendered stat cards become interactive roll buttons (`.rollable-dice`).
* **Dice Evaluator (`parseDiceExpression(expr)`)**:
  * Parses notation: `XdY + Z` (e.g. `1d20+7`, `2d6+4`, `1d8`).
  * Supports Advantage / Disadvantage for d20 rolls (Advantage takes `Math.max(r1, r2)`, Disadvantage takes `Math.min(r1, r2)`).
  * Highlights Natural 20s (`🎯 CRITICAL HIT!`) and Natural 1s (`💥 CRITICAL MISS!`).
* **Dice Output Display**: Displays glowing dice result toasts in `#dice-roll-toast-container` with individual die rolls breakdown `[5, 4] + 3 = 12`.

### B. Foundry VTT & 5eTools Exporters (`server.js`)
* `GET /api/statblocks/:id/export/foundry`: Serializes `lore_statblocks` entry into a standard Foundry VTT Actor JSON payload (`type: "npc"`, items, system stats).
* `GET /api/statblocks/:id/export/5etools`: Serializes stat block into 5eTools JSON format.

### C. Inline Article Markup Embeds (`public/js/wa-parser.js`)
* Extended `WAParser.parse(input)` to convert `[statblock]` or `[statblock=id]` BBCode tags into inline rendered stat cards inside the article reader.
* Bundled stat block data in `GET /api/articles/:id` payload under `article.statblocks` array for zero extra fetch calls.

### D. Vault Bestiary & Armory Explorer (`public/index.html` & `public/js/app.js`)
* `GET /api/worlds/:worldId/bestiary`: Fetches all stat blocks in the active world with sorting/filtering parameters (`?system=dnd5e`, `?cr=5`, `?type=character`, `?rarity=rare`).
* Bestiary View modal / tab rendering creature cards with 1-click jump to parent lore article.

---

## 2. Arthur's Gate 1 Socratic Review & Sign-Off Report

```markdown
=====================================================
🔥 ARTHUR'S GRILLING REPORT & GATE CHECKPOINT [GATE 1/4]
Feature: Stat Block Improvements (Dice Roller, VTT Export, Bestiary)
Status: GATE 1 APPROVED BY ARTHUR & PERSONA PANEL
=====================================================

### 🔍 Arthur's Key Interrogations & Verdict:
- [Issue 1]: Verified zero WebGL bloat; mathematical dice parser keeps app lightweight.
- [Issue 2]: Confirmed server-side article payload bundling prevents N+1 fetch cascades for inline embeds.
- [Issue 3]: Ensured Foundry VTT export schema complies with v11/v12 Actor JSON standards.

👉 Stage 2 Design Spec Ready. Proceeding to Stage 3 Implementation Plan.
```
