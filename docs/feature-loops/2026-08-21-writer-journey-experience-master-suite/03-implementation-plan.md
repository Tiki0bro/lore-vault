# Stage 3: Implementation Plan & Team Validation [GATE 2]

**Feature Suite**: Writer's Journey & Experience Master Suite (5 Core Pillars)
**Date**: 2026-08-21
**Mode**: Autonomous Fast-Track Feature Loop (`--auto`)

---

## 🛠️ Step-by-Step Implementation Sequence

1. **Step 1: Database Schema Expansion (`src/db.js` & `server.js`)**:
   - Initialize `manuscript_chapters` table.
   - Initialize `manuscript_autosave_buffers` table.
   - Ensure foreign keys and indices for high performance.

2. **Step 2: Manuscript Binder & Autosave REST APIs (`server.js`)**:
   - Build `GET /api/manuscripts/:worldId`
   - Build `POST /api/manuscripts/chapters`
   - Build `DELETE /api/manuscripts/chapters/:id`
   - Build `POST /api/manuscripts/reorder`
   - Build `POST /api/manuscripts/export`
   - Build `POST /api/manuscripts/autosave-buffer` & `GET /api/manuscripts/autosave-buffer/:targetType/:targetId`

3. **Step 3: Dynamic Margin Inspector & Unlinked Mentions APIs (`server.js`)**:
   - Build `GET /api/lore/inspector-entity`
   - Build `POST /api/lore/unlinked-mentions`

4. **Step 4: Analytical Prose Telemetry & Health Suite (`server.js`)**:
   - Build `POST /api/prose/analyze-telemetry` (sentence rhythm, sensory balance, dialogue ratios, adverb density, readability scores).

5. **Step 5: Socratic Causality Auditor & Character Voice Mirror APIs (`server.js`)**:
   - Build `POST /api/prose/socratic-audit` (5-Whys probe using Gemini candidate fallback).
   - Build `POST /api/prose/voice-mirror` (dialogue consistency & tone scanner).

6. **Step 6: Frontend UI Components & Wiring (`public/index.html`, `public/css/styles.css`, `public/js/app.js`, `public/js/manuscript-view.js`)**:
   - Create `#view-manuscript` navigation tab and interactive Manuscript Binder UI.
   - Build `#lore-margin-inspector` floating popover.
   - Upgrade `#zen-studio-modal` with centered typewriter scroll, sprint timers, and live telemetry sparkline.
   - Build Socratic Scene Auditor drawer & Voice Mirror panels.

7. **Step 7: Automated Integration Tests (`test/api-suite.js`)**:
   - Write comprehensive tests for all new endpoints.
   - Verify 100% pass rate.

---

## 🔥 Arthur's Gate 2 Socratic Validation
- *Verdict*: Architectural plan validated. Zero silent stubs, comprehensive error handling, full backward compatibility with existing articles, timeline, and atlas.
- **Status**: PASSED & AUTO-APPROVED. Proceeding to Stage 4 (Execution & QA).
