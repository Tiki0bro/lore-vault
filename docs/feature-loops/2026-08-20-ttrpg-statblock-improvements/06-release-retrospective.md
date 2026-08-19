# 06 - Release Retrospective & Decision Log

## Feature Title: TTRPG Stat Block Engine Improvements
**Date**: 2026-08-20  
**Feature Loop Directory**: `docs/feature-loops/2026-08-20-ttrpg-statblock-improvements/`

---

## 🚀 Accomplishments & What Went Well
1. **Interactive Dice Roller Engine**: `rollDiceExpression` in `public/js/app.js` evaluates dice notation (`1d20+7`, `2d6+4`), tracks Natural 20s / Natural 1s, and presents roll outcomes in toast notifications.
2. **Foundry VTT Exporter**: `GET /api/statblocks/:id/export/foundry` serializes stat block entries into standard Foundry VTT Actor JSON format.
3. **World Bestiary Index API**: `GET /api/worlds/:worldId/bestiary` provides filtered querying across world stat blocks.
4. **Inline BBCode Embeds**: `wa-parser.js` parses `[statblock]` tags directly into interactive stat card triggers.

---

## 🛠️ Key Architectural Decisions Logged to DECISIONS.md
* Added Foundry VTT Actor JSON exporter (`GET /api/statblocks/:id/export/foundry`), World Bestiary API (`GET /api/worlds/:worldId/bestiary`), bundled statblocks in `GET /api/articles/:id`, interactive dice roller (`rollDiceExpression`), and `[statblock]` inline BBCode tag in `wa-parser.js`.
