# 03 - TTRPG Stat Block System Implementation Plan

## Feature Title: Dedicated D&D 5e & Pathfinder 2e Stat Block Engine
**Date**: 2026-08-20  
**Feature Loop Directory**: `docs/feature-loops/2026-08-20-ttrpg-statblocks/`

---

## Proposed Technical Changes

### Task 1: Database Migration & SQLite Schema (`server.js`)
* Add `lore_statblocks` table creation query in `initDb()` in `server.js`.
* Include `idx_statblocks_article_id`, `idx_statblocks_system`, `idx_statblocks_type` indexes.

### Task 2: Backend REST API Endpoints (`server.js`)
* Implement `GET /api/articles/:articleId/statblock` with `?mode=player` DM secret filtering (`is_secret = 0`).
* Implement `POST /api/articles/:articleId/statblock` for creating/updating stat blocks.
* Implement `DELETE /api/statblocks/:id` for deletion.
* Implement `POST /api/statblocks/convert-ai` using `callGeminiApi` candidate fallback loop and `safeExtractJSON`.

### Task 3: HTML Markup & Structural Layout (`public/index.html`)
* Add `#statblock-drawer` slide-out container in `public/index.html`.
* Add `🛡️ Stat Block` action button in the article header toolbar (`#article-header-actions`).
* Build 3 tabs inside drawer: `#statblock-tab-view`, `#statblock-tab-edit`, `#statblock-tab-ai`.

### Task 4: CSS Design System & Theme Styling (`public/css/styles.css`)
* Add `.statblock-drawer` slide-out panel layout with CSS smooth transition.
* Add `.dnd5e-statblock` styles: burgundy headers (`#7a200d`), gold filigree borders (`#c99a3f`), 2-column attribute grid, tapered hr lines.
* Add `.pf2e-statblock` styles: burgundy header (`#5b1414`), action badges (`[1 Action]`, `[2 Actions]`), defense pills.
* Add `.weapon-statcard` and `.lore-statcard` styles.

### Task 5: Client JS Integration & Controller Logic (`public/js/app.js`)
* Add `StatBlockController` methods in `public/js/app.js` (or inline stat block helper):
  * `toggleStatBlockDrawer(articleId)`
  * `loadStatBlock(articleId)`
  * `renderStatBlockHTML(statblock)`
  * `saveStatBlock(articleId, formData)`
  * `convertLoreToStatBlockAI(articleId, system, type)`
* Register keyboard shortcut `Ctrl + Shift + S`.

### Task 6: Automated Integration Test Suite (`test/api-suite.js`)
* Add test cases in `test/api-suite.js`:
  1. `POST /api/articles/:articleId/statblock` creates a valid D&D 5e stat block.
  2. `GET /api/articles/:articleId/statblock` fetches the stat block and filters out DM secrets when `?mode=player`.
  3. `DELETE /api/statblocks/:id` removes the stat block.

---

## 🔍 Arthur's Gate 2 Socratic Checkpoint Report

```markdown
=====================================================
🔥 ARTHUR'S GRILLING REPORT & GATE CHECKPOINT [GATE 2/4]
Feature: TTRPG Stat Block Implementation Plan
Status: GATE 2 APPROVED BY ARTHUR & DEV TEAM
=====================================================

### 🔍 Key Engineering Directives:
- **TDD Requirement**: Pre-flight test suite must run before code modifications.
- **Empirical Verification**: Post-flight test run must pass 100% of integration checks.
- **Zero Silent Stubs**: Gemini AI conversion route must invoke live API with fallback retries.

👉 Implementation Plan Approved. Proceeding to Stage 4 Execution & QA Verification.
```
