# Stage 3: Implementation Plan & Team Validation

**Feature Title**: World Doctor Suite v3 Overhaul (6 Core Enhancements)
**Date**: 2026-08-20

---

## 🛠️ Step-by-Step Implementation Breakdown

### Phase 1: Database & Backend Endpoints (`server.js`)
- [ ] **Step 1.1**: Add `audit_health_history` SQLite table creation in `server.js`.
- [ ] **Step 1.2**: Implement `GET /api/audit/health-history`, `POST /api/audit/clean-tags`, and `POST /api/audit/undo-batch-repair` in `server.js`.
- [ ] **Step 1.3**: Update `app.all(['/api/audit/run', '/api/audit/scan'])` to scan unmapped locations (against `map_pins`), compute lore gaps (pillar distribution), detect orphan tags, and record health history snapshots.

### Phase 2: Frontend Dashboard UI Extensions (`public/index.html`, `public/js/app.js`, `public/css/styles.css`)
- [ ] **Step 2.1**: Update `#doctor-modal` in `public/index.html`:
  - Add `#doctor-sparkline-container` for SVG trend chart.
  - Add `#doctor-lore-gaps-card` for Lore Gap Finder.
  - Add `#doctor-unmapped-locations-list` in Unmapped tab.
  - Add `[↩️ Undo Last Batch Repair]` button container.
- [ ] **Step 2.2**: Update JavaScript controller in `public/js/app.js`:
  - Implement `renderHealthScoreSparkline(history)` SVG chart renderer.
  - Implement `undoBatchRepairWorldDoctor()` calling `/api/audit/undo-batch-repair`.
  - Implement `cleanOrphanTags()` calling `/api/audit/clean-tags`.
  - Update `importWorld()` callback to trigger post-import triage toast.

### Phase 3: Integration Testing & Verification (`npm test`)
- [ ] **Step 3.1**: Add automated integration tests in `test/api-suite.js`.
- [ ] **Step 3.2**: Run `npm test` and verify 100% green test results.

---

## 🔥 Arthur's Grilling Sign-Off (Stage 3 Gate 2)
**Arthur's Verdict**: PASSED. Proceed to Stage 4 (Execution & QA).
