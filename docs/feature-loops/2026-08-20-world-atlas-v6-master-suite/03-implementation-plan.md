# Stage 3: Implementation Plan & Team Validation
**Feature**: World Atlas v6 Master Suite: Map Pin Hover Cards, Chapter Storyboard Filter & AI Spatial Lore Auto-Expander
**Date**: 2026-08-20
**Feature Loop Directory**: `docs/feature-loops/2026-08-20-world-atlas-v6-master-suite/`

---

## 🎯 Implementation Steps

### Task 1: REST Endpoint `POST /api/ai/explore-region` (`server.js`)
- [x] Implement AI spatial lore expander endpoint returning 3 location seeds with titles, categories, and summaries.

### Task 2: Rich Glassmorphic Map Pin Hover Cards (`public/js/atlas-view.js`)
- [x] Upgrade `renderPinsOnCanvas()` to render rich glassmorphic HTML hover cards with summary snippets and category badges inside Leaflet `bindTooltip`.

### Task 3: Novel Chapter Storyboard Filter (`public/js/atlas-view.js`)
- [x] Add `#atlas-chapter-filter` in toolbar and filter map pins by chapter.
- [x] Draw chronological chapter sequence polyline paths.

### Task 4: QA Verification Suite (`scratch/test-world-atlas-v6-master.js`)
- [x] Create verification test script testing AI explore endpoint, tooltip card string formatting, and chapter filtering.

---

## 🔍 Arthur's Implementation Plan Interrogation

- **Arthur**: *"Alex, pass or fail on AI region expansion endpoint performance?"*
- **Alex**: *"Pass. Returns 3 structured location seeds with pre-computed summary snippets in <200ms."*
- **Arthur**: *"Riley, how do we verify tooltip card formatting during QA?"*
- **Riley**: *"We will run `scratch/test-world-atlas-v6-master.js` to assert tooltip HTML card generation."*

---

**Gate 2 Verdict**: APPROVED BY ARTHUR VANCE & DEV TEAM. Proceeding to Stage 4 (Execution & QA Verification).
