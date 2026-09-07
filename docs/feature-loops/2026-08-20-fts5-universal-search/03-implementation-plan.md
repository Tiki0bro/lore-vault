# Stage 3: Implementation Plan — SQLite FTS5 Universal Search Engine

## Implementation Breakdown

1. **Update `src/db.js`**:
   - Add `articles_fts` FTS5 virtual table initialization and synchronization triggers.
   - Index existing articles into `articles_fts` on startup.

2. **Add `GET /api/search/fts` Route in `src/routes/articles.js`**:
   - Implement FTS5 keyword matching with `snippet()` highlight extraction.
   - Filter DM secrets in player mode.

3. **Enhance Universal Search Modal in `public/js/app.js` & `public/index.html`**:
   - Call `/api/search/fts?q=...` when typing in Universal Search (`Ctrl+K`).
   - Render highlight snippets with category badges.

4. **Add Automated Integration Test Cases in `test/api-suite.js`**:
   - Verify `GET /api/search/fts` returns highlighted snippets and respects DM secret filtering.
