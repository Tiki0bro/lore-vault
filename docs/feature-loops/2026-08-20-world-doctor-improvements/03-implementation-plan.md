# Stage 3: Implementation Plan & Team Validation

**Feature Title**: World Doctor & Vault Health Suite Overhaul
**Date**: 2026-08-20

---

## 🛠️ Step-by-Step Implementation Breakdown

### Phase 1: Pre-Flight Baseline Verification & Backend API Extensions (`server.js`)
- [ ] **Step 1.1**: Run pre-flight verification script/test on existing `/api/audit/run` to confirm current health score calculation and baseline behavior.
- [ ] **Step 1.2**: Extend `/api/audit/run` & `/api/audit/scan` in `server.js`:
  - Add dead cross-link detection (`findDeadCrossLinks`).
  - Add circular relationship detection (`findCircularRelations`).
  - Update penalties and multi-factor health score formula.
- [ ] **Step 1.3**: Update `POST /api/audit/flesh-out-stub` in `server.js`:
  - Check `getAIConfig().no_generate_mode`. If `true`, return structured WorldAnvil outline without AI generation.
  - Pass `tone_preset` into prompt when generating prose.
- [ ] **Step 1.4**: Build `POST /api/audit/batch-repair` in `server.js`:
  - Handle `fix_misclassified`, `crosslink_orphans`, and `clean_stubs` with SQLite update + `syncFileToStorage`.
- [ ] **Step 1.5**: Build `GET /api/audit/export-report` in `server.js`:
  - Generate clean Markdown audit report with health metrics, severity lists, and recommendations.

### Phase 2: Frontend Doctor Dashboard Overhaul (`public/index.html`, `public/js/app.js`, `public/css/styles.css`)
- [ ] **Step 2.1**: Update `#doctor-modal` HTML in `public/index.html`:
  - Add severity tab filters (`#doctor-filter-all`, `#doctor-filter-critical`, `#doctor-filter-warnings`, `#doctor-filter-optimizations`).
  - Add Batch Auto-Fix (`#doctor-batch-fix-btn`) and Export Report (`#doctor-export-report-btn`) action buttons.
- [ ] **Step 2.2**: Update CSS in `public/css/styles.css`:
  - Styling for severity badges (`.severity-critical`, `.severity-warning`, `.severity-optimization`).
  - Health score SVG gauge animation and dynamic color styles.
- [ ] **Step 2.3**: Update JavaScript controller in `public/js/app.js`:
  - Update `runWorldAudit()` to render dead links and circular relations.
  - Implement `filterDoctorSeverity(severity)` to switch visible issues.
  - Implement `batchRepairWorldDoctor(actions)` to call `/api/audit/batch-repair` with UI loading state and toast feedback.
  - Implement `exportWorldDoctorReport()` to download generated Markdown audit report.

### Phase 3: Post-Flight Empirical Verification & Test Suite (`npm test`)
- [ ] **Step 3.1**: Create regression test script `test/world_doctor_overhaul.test.js` or run comprehensive node verification script.
- [ ] **Step 3.2**: Execute tests and verify zero silent errors, proper parameter passthrough, and DOM event bindings.

---

## 🔥 Arthur's Grilling Sign-Off (Stage 3 Gate 2)
**Arthur's Verdict**: PASSED. Implementation plan is modular, TDD-backed, and zero-stub guaranteed. Proceed to Stage 4 (Execution & QA).
