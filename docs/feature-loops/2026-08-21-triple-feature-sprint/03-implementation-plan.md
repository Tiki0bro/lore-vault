# Stage 3: Implementation Plan & Team Validation

**Feature Title**: Triple Feature Sprint (Spotlight Search, NPC Dialogue Simulator, World Census Dashboard)
**Date**: 2026-08-21

---

## 🛠️ Step-by-Step Implementation Breakdown

### Phase 1: Backend Endpoints (`server.js`)
- [ ] **Step 1.1**: Implement `GET /api/search/fts` with FTS5 / LIKE keyword stemming and snippet extraction.
- [ ] **Step 1.2**: Implement `POST /api/simulation/npc-dialogue` with in-character prompt building and emotion tracking.
- [ ] **Step 1.3**: Implement `GET /api/census/stats` with demographic counts, category breakdown, and completeness scoring.

### Phase 2: Frontend Interfaces (`public/index.html`, `public/js/app.js`)
- [ ] **Step 2.1**: Update `#command-palette` in `public/index.html` to support live FTS snippets and keyboard selection.
- [ ] **Step 2.2**: Add `#npc-dialogue-modal` chat interface in `public/index.html` and `openNPCDialogueModal()` in `public/js/app.js`.
- [ ] **Step 2.3**: Add `#tab-census` button and `view-census` container in `public/index.html` and `renderWorldCensusDashboard()` in `public/js/app.js`.

### Phase 3: Automated Integration Tests (`test/api-suite.js`)
- [ ] **Step 3.1**: Add automated integration tests for `/api/search/fts`, `/api/simulation/npc-dialogue`, and `/api/census/stats`.
- [ ] **Step 3.2**: Run `npm test` and verify 100% green test execution.

---

## 🔥 Arthur's Grilling Sign-Off (Stage 3 Gate 2)
**Arthur's Verdict**: PASSED. Proceed to Stage 4 (Execution & QA).
