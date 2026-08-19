# Stage 2: Design Spec & Gap Remediation Loop

**Feature Title**: World Doctor UX Ease-of-Use & Dismissal Suite
**Date**: 2026-08-20

---

## 1. Executive Summary

This specification introduces 3 key ease-of-use enhancements to **World Doctor**:
1. **Top 3 Quick-Fix Hero Card**: Prominent banner showcasing the 3 highest-value audit repairs with 1-click action buttons and projected health point gains.
2. **Issue Dismissal & Suppression Engine (`POST /api/audit/dismiss`, `GET /api/audit/ignored`)**: Ability to mark specific stubs, orphans, or dead links as "Intentional / Ignored", preventing them from docking points from the World Health Score.
3. **1-Click Copy Markdown Health Summary (`copyWorldDoctorSummary()`)**: Button copying a beautifully formatted markdown snippet to the system clipboard.

---

## 2. API Contract & Architectural Specifications

### 2.1 Issue Dismissal Endpoints (`/api/audit/dismiss`, `/api/audit/ignored`)
- **Table Schema**: `ignored_audit_issues (issue_key TEXT PRIMARY KEY, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`
- **POST `/api/audit/dismiss`**:
  - Request: `{ issue_key: "stub:art-123" }` or `{ issue_key: "deadlink:art-456::target" }`
  - Behavior: Inserts `issue_key` into `ignored_audit_issues` (or deletes if toggling off).
  - Response: `{ success: true, isIgnored: true }`
- **GET `/api/audit/ignored`**:
  - Response: `{ ignoredKeys: ["stub:art-123", ...] }`

### 2.2 Audit Scanner Suppression Integration (`/api/audit/run`)
- Audit scanner fetches `ignored_audit_issues` keys.
- If an item matches an ignored key:
  - It is excluded from penalties calculation.
  - It is moved to `ignoredArticles` / `ignoredCount` in audit response.

---

## 3. UI/UX Component Extensions (`public/index.html`, `public/js/app.js`)

1. **Top 3 Quick-Fix Hero Banner (`#doctor-quick-fixes-hero`)**:
   - Placed directly below the CTA banner in `#doctor-modal`.
   - Displays 3 cards: Issue Title, Category Badge, Health Score Impact (`+12 pts`), and 1-Click Action Button.
2. **Inline Issue Item Controls**:
   - Each audit item in lists includes an `[👁️ Ignore]` button.
   - Clicking `[👁️ Ignore]` toggles suppression and immediately re-scans audit.
3. **1-Click CTA Button (`[📋 Copy Summary]`)**:
   - Placed in doctor CTA button bar.
   - Copies formatted markdown report to clipboard with toast confirmation.

---

## 🔥 Arthur's Grilling Remediation Log (Stage 2 Gate 1)
- **Question**: "What if a user accidentally ignores an issue and wants to un-ignore it?"
- **Remediation**: The Ignored tab in Doctor modal shows all currently suppressed issues with an `[↩️ Unignore]` button to restore them to active status.
