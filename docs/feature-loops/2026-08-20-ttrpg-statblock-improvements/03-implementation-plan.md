# 03 - TTRPG Stat Block Engine Improvements Implementation Plan

## Feature Title: TTRPG Stat Block Engine Improvements (Interactive Dice Roller, VTT Exporters, Bestiary Index & Article Embeds)
**Date**: 2026-08-20  
**Feature Loop Directory**: `docs/feature-loops/2026-08-20-ttrpg-statblock-improvements/`

---

## Proposed Technical Changes

### Task 1: Server Payload Bundling & VTT Exporters (`server.js`)
* Update `GET /api/articles/:id` in `server.js` to include associated `statblocks` array in the response payload.
* Add `GET /api/statblocks/:id/export/foundry` endpoint for downloading Foundry VTT JSON actors.
* Add `GET /api/worlds/:worldId/bestiary` endpoint for querying all stat blocks across a world.

### Task 2: Inline Article Markup Parser (`public/js/wa-parser.js`)
* Extend `WAParser.parse(input)` to convert `[statblock]` or `[statblock=id]` into rendered inline stat cards.

### Task 3: Interactive Dice Roller Engine (`public/js/app.js` & `public/css/styles.css`)
* Add `rollDiceExpression(expression, label)` in `public/js/app.js`.
* Wrap damage numbers (`2d6+4`), attack modifiers (`+7`), and saving throws in `.rollable-dice` buttons in `renderStatBlockCard`.
* Build toast notification overlay for displaying live dice rolls (`🎲 Rolled 1d20+7: [16] + 7 = 23!`).

### Task 4: Vault Bestiary & Armory Explorer Modal (`public/index.html` & `public/js/app.js`)
* Add `#bestiary-modal` container in `public/index.html` with CR rating filters, system filters, search input, and grid of stat block cards.
* Add `🐉 Bestiary` action button in navbar and command palette.

### Task 5: Automated Integration Test Suite (`test/api-suite.js`)
* Add test cases in `test/api-suite.js`:
  1. `GET /api/articles/:id` includes bundled `statblocks` payload.
  2. `GET /api/statblocks/:id/export/foundry` returns valid Foundry VTT JSON format.
  3. `GET /api/worlds/:worldId/bestiary` returns filtered list of world stat blocks.

---

## 🔍 Arthur's Gate 2 Socratic Checkpoint Report

```markdown
=====================================================
🔥 ARTHUR'S GRILLING REPORT & GATE CHECKPOINT [GATE 2/4]
Feature: TTRPG Stat Block Engine Improvements Implementation Plan
Status: GATE 2 APPROVED BY ARTHUR & DEV TEAM
=====================================================

👉 Implementation Plan Approved. Proceeding to Execution & TDD Verification.
```
