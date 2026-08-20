# Stage 3: Implementation Plan — Party Battles, Diff Viewer & Story Appender

## Task Breakdown & Order of Implementation

### Task 1: Multi-Party Fight Simulator & Pre-Rollback Guard ([server.js](file:///c:/Users/EthenGreening/.gemini/antigravity/scratch/lore-vault/server.js))
- Update `POST /api/ai/simulate-fight` in `server.js` to process arrays of combatants (`party_a` and `party_b`) with spell/recharge ability triggers.
- Update `POST /api/articles/:id/rollback` to write a pre-rollback snapshot before overwriting files.
- Add `GET /api/templates/export` and `POST /api/templates/import` REST endpoints.

### Task 2: Frontend Story Appender & Visual Diff Renderer ([public/index.html](file:///c:/Users/EthenGreening/.gemini/antigravity/scratch/lore-vault/public/index.html) & [public/js/app.js](file:///c:/Users/EthenGreening/.gemini/antigravity/scratch/lore-vault/public/js/app.js))
- Add `✍️ Append to Current Article` button to `#fight-simulator-modal` and `appendFightStoryToCurrentArticle()` in `app.js`.
- Add visual green/red line diff renderer helper `renderLineDiff()` to `previewRevision()` in `app.js`.
- Add export/import buttons to `#template-builder-modal` with `exportTemplates()` and `importTemplates()` methods.

### Task 3: Visual Diff CSS Styling ([public/css/styles.css](file:///c:/Users/EthenGreening/.gemini/antigravity/scratch/lore-vault/public/css/styles.css))
- Add CSS rules for `.diff-line-add` (green tint) and `.diff-line-del` (red tint) in diff viewer.

### Task 4: Automated Integration Test Suite ([test/api-suite.js](file:///c:/Users/EthenGreening/.gemini/antigravity/scratch/lore-vault/test/api-suite.js))
- Add automated test assertions verifying multi-party fight simulation, pre-rollback snapshot creation, and template export/import endpoints.
