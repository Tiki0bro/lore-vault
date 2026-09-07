# Design Specification — World Doctor Suite v3 Overhaul

**Topic**: World Doctor Suite v3 Overhaul (6 Core Enhancements)  
**Date**: 2026-08-20  
**Status**: APPROVED DESIGN  

---

## 1. Overview

The **World Doctor Suite v3 Overhaul** elevates LoreVault's worldbuilding advisor into an intelligent, trend-aware, safety-buffered, and atlas-integrated diagnostic engine. It introduces 6 major capabilities across backend services and frontend UI components.

---

## 2. Component & Feature Specifications

### 2.1 Taxonomy & Tag Consistency Auditor
- **Backend (`/api/audit/run`)**:
  - Scans all tags across articles in target world scope.
  - Flags **Orphan Tags** (tags assigned to only 1 article) and **Empty/Whitespace Tags**.
  - Endpoint `POST /api/audit/clean-tags`: Accepts `{ world_id, action: 'purge_orphans' | 'merge_tag', sourceTag, targetTag }`.
- **UI (`#doctor-modal`)**:
  - Renders tag diagnostic items with 1-click `[Purge Tag]` or `[Merge Tag]` actions.

### 2.2 Health Score History Sparkline & Trend Tracker
- **Database Schema**:
  ```sql
  CREATE TABLE IF NOT EXISTS audit_health_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    world_id TEXT NOT NULL,
    health_score INTEGER NOT NULL,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  ```
- **Backend (`/api/audit/run`, `GET /api/audit/health-history`)**:
  - Automatically inserts health score snapshot into `audit_health_history`.
  - Endpoint `GET /api/audit/health-history?world_id=`: Returns history points `[{ health_score, timestamp }]`.
- **UI (`#doctor-panel-overview`)**:
  - Renders an interactive SVG sparkline chart showing health score trajectory over time.

### 2.3 Automated Post-Import Triage Notification
- **Backend (`/api/import/*`)**:
  - Returns `importAuditStats: { totalImported, healthScore, misclassifiedCount, stubCount }` in import responses.
- **UI (`public/js/app.js`)**:
  - Automatically triggers a non-intrusive toast banner after import completion:
    `"📥 Import Complete: Scanned 14 articles — Health Score is 92/100. [View Doctor Audit]"`

### 2.4 1-Click "Undo Batch Repair" Safety Buffer
- **Backend (`POST /api/audit/undo-batch-repair`)**:
  - Accepts `{ snapshots: [{ articleId, previousCategory, previousSubCategory, previousContent }] }`.
  - Reverts database columns and syncs `.md` files to disk atomically.
- **UI (`public/js/app.js`)**:
  - Captures article state prior to executing `batchRepairWorldDoctor()`.
  - Shows a temporary `[↩️ Undo Last Batch Repair]` banner in `#doctor-modal` allowing instant 1-click restoration.

### 2.5 AI Lore Gap Finder & Structural Prompts
- **Backend (`/api/audit/run`)**:
  - Evaluates category distribution against standard worldbuilding pillars (`Locations`, `Characters`, `Factions`, `Magic Systems`, `History`, `Items`).
  - Identifies missing or severely under-represented pillars (`count == 0` or `< 10%` of total).
- **UI (`#doctor-panel-overview`)**:
  - Renders a **"Lore Gap Finder"** card recommending missing core pillars with a 1-click `[+ Create Foundation Stub]` action.

### 2.6 Unmapped Location Atlas Checker
- **Backend (`/api/audit/run`)**:
  - Cross-references articles in `Locations` category against `map_pins` table in SQLite (`SELECT DISTINCT article_id FROM map_pins`).
  - Flags location articles that have `0` associated map pins as `unmappedLocations`.
- **UI (`#doctor-tab-nav`)**:
  - Adds an `Unmapped Locations` metric card & tab view with 1-click `[📍 View Maps]` button.

---

## 3. API Summary Table

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/audit/clean-tags` | POST | Purge or merge orphan tags |
| `/api/audit/health-history` | GET | Retrieve historical health score snapshots for sparkline chart |
| `/api/audit/undo-batch-repair` | POST | Revert pre-batch repair snapshot across DB and Markdown storage |
| `/api/audit/run` | GET/POST | Enhanced with taxonomy auditor, gap finder, and unmapped location scanner |

---

## 4. Verification & Testing Strategy

1. **Automated Integration Tests (`test/api-suite.js`)**:
   - Test `audit_health_history` persistence and sparkline query.
   - Test `POST /api/audit/undo-batch-repair` snapshot restoration.
   - Test tag cleaning endpoint and unmapped location detection.
2. **Empirical Verification**:
   - Run `npm test` and confirm 100% green test execution.
