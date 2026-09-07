# Stage 3: Implementation Plan & Team Validation

**Feature Title**: World Doctor Suite v4 Diagnostic Expansion (5 Advanced Features)
**Date**: 2026-08-20

---

## 🛠️ Step-by-Step Implementation Breakdown

### Phase 1: Backend Audit Scanner Extensions (`server.js`)
- [ ] **Step 1.1**: Update `app.all(['/api/audit/run', '/api/audit/scan'])`:
  - Query `timeline_events` and scan for date discrepancies (`anachronisms`).
  - Query `factions` and `relations` to detect alliance triangle tensions (`factionTensions`).
  - Query `lore_statblocks` where `is_secret = 1` and scan public articles for title matches (`secretLeaks`).
  - Cross-reference article titles across other `world_id`s in SQLite (`crossWorldBleed`).
  - Aggregate category word counts and compute category depth heatmap (`categoryDepthHeatmap`).

### Phase 2: Frontend Dashboard UI Extensions (`public/index.html`, `public/js/app.js`)
- [ ] **Step 2.1**: Update `#doctor-tab-nav` and `#doctor-modal` in `public/index.html`:
  - Add tab buttons for `⏳ Anachronisms`, `⚔️ Tensions`, `🔒 Spoilers`, `🌐 World Bleed`.
  - Add `#doctor-panel-anachronisms`, `#doctor-panel-tensions`, `#doctor-panel-spoilers`, `#doctor-panel-bleed`.
  - Add `#doctor-category-depth-heatmap` inside `#doctor-panel-overview`.
- [ ] **Step 2.2**: Update JavaScript controller in `public/js/app.js`:
  - Render metrics and list items for all 4 new panels.
  - Render category depth progress bars inside overview panel.

### Phase 3: Automated Integration Tests (`test/api-suite.js`)
- [ ] **Step 3.1**: Add automated integration tests verifying v4 audit checks.
- [ ] **Step 3.2**: Run `npm test` and verify 100% green test execution.

---

## 🔥 Arthur's Grilling Sign-Off (Stage 3 Gate 2)
**Arthur's Verdict**: PASSED. Proceed to Stage 4 (Execution & QA).
