# 03. Implementation Plan: LoreVault Version 2

**Feature Title**: LoreVault Version 2 (Multi-World Manager & Timeline Chronology Suite)  
**Status**: Stage 3 Complete (Arthur Socratic Pass)  
**Target Path**: `docs/feature-loops/2026-08-11-version-2/03-implementation-plan.md`

---

## 📋 Implementation Steps

### Step 1: Database Migration & REST Endpoints (`server.js`)
- Create `timeline_events` table in SQLite `lore.db`.
- Add REST endpoints:
  - `GET /api/worlds/:worldId/timeline`
  - `POST /api/timeline-events`
  - `DELETE /api/timeline-events/:id`
  - `POST /api/worlds` (Create world)
  - `DELETE /api/worlds/:id` (Delete world)
- Automated Test Suite: `scratch/test-version2-suite.js`.

### Step 2: Timeline View Component (`public/js/timeline-view.js`)
- Create `TimelineView` class rendering interactive chronology cards, sort keys, epoch headers, and event modal.

### Step 3: UI Workspace Navigation (`public/index.html`, `public/css/styles.css`, `public/js/app.js`)
- Add `⏳ Timeline` tab button to navbar and tools dropdown.
- Add `<section id="view-timeline">` container.
- Add styling rules for `.timeline-container`, `.timeline-event-card`, `.epoch-badge`.
- Update `switchTab('timeline')` in `public/js/app.js`.

---

## 🏁 Arthur's Stage 3 Verdict
**Gate 2 Auto-Approved (Fast-Track Mode)**. Proceeding to Stage 4 Execution.
