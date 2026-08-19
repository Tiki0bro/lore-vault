# Stage 3: Implementation Plan & Team Validation
**Feature**: AI Map Generator Scope Calibration & Multi-Provider Image Synthesis Overhaul
**Date**: 2026-08-20
**Feature Loop Directory**: `docs/feature-loops/2026-08-20-ai-map-generator-scope-and-image-synthesis-overhaul/`

---

## 🎯 Implementation Steps

### Task 1: UI Prompt Preview & Provider Selection (`public/js/atlas-view.js` & `public/css/styles.css`)
- [x] Add provider selection chips (`🌸 Pollinations AI (Flux)` vs `🤖 Google Gemini AI`) in `#gen-ai-settings`.
- [x] Add live prompt preview container `<div id="gen-prompt-preview">` in `#atlas-generate-modal`.
- [x] Wire live prompt update listener on scope card clicks, style chip clicks, custom prompt inputs, and title changes.
- [x] Auto-suggest scope card based on article category when checking an article.

### Task 2: Backend Prompt Synthesis & Single Pin Isolation (`server.js`)
- [x] Implement robust `buildAIPromptPayload(mapTitle, mapScope, mapStyle, customPrompt)` in `server.js` with distinct, highly detailed prompts for `battlemap`, `city`, `town`, `region`, `world`, `treasure`.
- [x] Isolate pin placement in `handleProceduralMapGeneration`: when `selectedArticleIds.length === 1`, place exactly **1 PIN** centered at `(0.50, 0.50)` for that article and eliminate scatter.
- [x] Pass provider selection (`ai_provider`) from client request payload.

### Task 3: Comprehensive QA Verification Suite (`scratch/test-ai-map-overhaul.js`)
- [x] Create verification test suite testing prompt payload construction across all 6 scopes.
- [x] Test pin isolation when 1 location article is checked vs multiple articles.
- [x] Test provider selection payload passthrough and fallback notifications.

---

## 🔍 Arthur's Implementation Plan Interrogation

- **Arthur**: *"Alex, will this break any existing map pins or database schemas?"*
- **Alex**: *"No schema changes required. `maps` and `map_pins` tables remain 100% untouched. All changes are pure prompt synthesis and pin filtering logic."*
- **Arthur**: *"Riley, how will we verify that 'battlemap' scope generates tactical prompts instead of continental prompts?"*
- **Riley**: *"We will run `scratch/test-ai-map-overhaul.js` to assert that `map_scope: 'battlemap'` generates a prompt containing 'tactical combat battlemap grid' and 'encounter map layout'."*

---

**Gate 2 Verdict**: APPROVED BY ARTHUR VANCE & DEV TEAM. Proceeding to Stage 4 (Execution & QA Verification).
