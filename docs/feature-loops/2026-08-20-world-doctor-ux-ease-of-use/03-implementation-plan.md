# Stage 3: Implementation Plan & Team Validation

**Feature Title**: World Doctor UX Ease-of-Use & Dismissal Suite
**Date**: 2026-08-20

---

## 🛠️ Step-by-Step Implementation Breakdown

### Phase 1: Database Table & Backend Endpoints (`server.js`)
- [ ] **Step 1.1**: Initialize `ignored_audit_issues` SQLite table in `server.js` (`CREATE TABLE IF NOT EXISTS ignored_audit_issues...`).
- [ ] **Step 1.2**: Implement `POST /api/audit/dismiss` and `GET /api/audit/ignored` endpoints in `server.js`.
- [ ] **Step 1.3**: Update `app.all(['/api/audit/run', '/api/audit/scan'])` to fetch `ignored_audit_issues` and suppress matching issues from penalties.

### Phase 2: Frontend Dashboard UI Extensions (`public/index.html`, `public/js/app.js`)
- [ ] **Step 2.1**: Update `#doctor-modal` in `public/index.html`:
  - Add `#doctor-quick-fixes-hero` container.
  - Add `[📋 Copy Summary]` button to CTA bar.
  - Add `Ignored` tab to Doctor tab navigation (`#doctor-tab-nav`).
- [ ] **Step 2.2**: Update JavaScript controller in `public/js/app.js`:
  - Implement `toggleDismissAuditIssue(issueKey)` to call `/api/audit/dismiss` and re-audit.
  - Implement `renderQuickFixesHero(data)` to calculate and display the top 3 quick repair recommendations with projected score gains.
  - Implement `copyWorldDoctorSummary()` to copy formatted Markdown summary to system clipboard with navigator.clipboard.writeText.

### Phase 3: Verification & Integration Testing (`npm test`)
- [ ] **Step 3.1**: Add automated API tests for issue dismissal and markdown copy endpoints in `test/api-suite.js`.
- [ ] **Step 3.2**: Execute `npm test` and verify 100% green test suite.

---

## 🔥 Arthur's Grilling Sign-Off (Stage 3 Gate 2)
**Arthur's Verdict**: PASSED. Clear steps, zero breaking changes, TDD-backed. Proceed to Stage 4 (Execution & QA).
