# Stage 3: Implementation Plan — Templates, Revision History & Theme Studio

## Task Breakdown & Order of Implementation

### Task 1: Backend Database & Revision History Engine ([server.js](file:///c:/Users/EthenGreening/.gemini/antigravity/scratch/lore-vault/server.js))
- Create `lore_templates` SQLite table and REST endpoints:
  - `GET /api/templates`
  - `POST /api/templates`
  - `DELETE /api/templates/:id`
- Implement automatic non-destructive revision snapshotting in `saveArticleWithDiskSync` to `storage/history/${article_id}/${timestamp}.md`.
- Implement `GET /api/articles/:id/history` and `POST /api/articles/:id/rollback`.

### Task 2: Frontend Modals & Theme Studio Drawer ([public/index.html](file:///c:/Users/EthenGreening/.gemini/antigravity/scratch/lore-vault/public/index.html))
- Add `#template-builder-modal` for creating custom article category schemas.
- Add `#revision-history-modal` for viewing version snapshots and 1-click restoring.
- Add `#theme-studio-drawer` slide-out container with CSS color picker inputs, font selector, and genre presets.

### Task 3: Client App Controller Methods ([public/js/app.js](file:///c:/Users/EthenGreening/.gemini/antigravity/scratch/lore-vault/public/js/app.js) & [public/css/styles.css](file:///c:/Users/EthenGreening/.gemini/antigravity/scratch/lore-vault/public/css/styles.css))
- Implement `openTemplateBuilderModal()`, `saveCustomTemplate()`, `loadTemplates()`.
- Implement `openRevisionHistoryModal()`, `restoreRevision()`.
- Implement `openThemeStudioDrawer()`, `applyThemePreset()`, `saveCustomTheme()`, `initCustomTheme()`.

### Task 4: Automated Integration Test Suite ([test/api-suite.js](file:///c:/Users/EthenGreening/.gemini/antigravity/scratch/lore-vault/test/api-suite.js))
- Add automated test cases for templates CRUD, revision history list, and 1-click rollback endpoints.
