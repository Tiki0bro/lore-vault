# Stage 3: Implementation Plan — Express Route Modularization

## Step-by-Step Refactoring Plan

1. **Create Shared Service Modules**:
   - `src/db.js` — Database connection & table initializations.
   - `src/helpers/markdown-helpers.js` — Disk dual-sync, cross-link parsing, WorldAnvil frontmatter parser & serializers.
   - `src/helpers/ai-helpers.js` — Gemini model fallback retry loop & AI settings managers.

2. **Extract Express Routers into `src/routes/`**:
   - `src/routes/articles.js`
   - `src/routes/ai.js`
   - `src/routes/vtt.js`
   - `src/routes/atlas.js`
   - `src/routes/audit.js`
   - `src/routes/templates.js`
   - `src/routes/simulation.js`
   - `src/routes/worlds.js`

3. **Simplify `server.js`**:
   - Mount static file middleware and Express body parsers.
   - Mount router modules using `app.use(router)`.
   - Export `{ app, db, ... }` for testing compatibility.

4. **Verify Clean Execution**:
   - Run `npm test` to verify all 33 automated tests pass.
