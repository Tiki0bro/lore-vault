# Stage 2: Design Specification & Architecture

**Feature Title**: Backend Error Resilience & Data Sync Integrity
**Date**: 2026-08-13
**Mode**: Autonomous Fast-Track (`--auto`)

---

## 1. Technical Architecture & Component Design

### Component A: Standardized API Error Handler & Logging (`sendApiError`)
- Function Signature: `sendApiError(res, statusCode, code, message, err = null)`
- Standard JSON Error Output Format:
  ```json
  {
    "status": "error",
    "code": "ERR_BAD_REQUEST" | "ERR_NOT_FOUND" | "ERR_INTERNAL" | "ERR_AI_FAILURE",
    "message": "Human-readable error description"
  }
  ```
- Replaces all 25+ silent `catch (e) {}` blocks across `server.js` with `console.error('[API Error RouteName]:', err.message)` logging and explicit HTTP error responses.

### Component B: Lightweight Payload Type & Boundary Validation (`validateFields`)
- Function Signature: `validateFields(body, requiredKeys = [])`
- Checks for missing required fields on `POST`/`PUT` endpoints. Returns `null` if valid, or a descriptive error string if missing/invalid.

### Component C: Dual-Storage Write-First Transaction Sync (`saveArticleWithDiskSync`)
- Workflow:
  1. Prepare Markdown content and sanitize file path in `storage/` or `data/`.
  2. Write file to disk using `fs.writeFileSync(filePath, markdownData)`.
  3. Execute SQLite `INSERT` or `UPDATE` query on `lore.db`.
  4. If SQLite fails, attempt `fs.unlinkSync(filePath)` (if new article) or restore previous file content (if existing article), rolling back filesystem changes and returning HTTP 500.

### Component D: Automated API Test Suite (`test/api-suite.js`)
- Uses Node's built-in test runner (`node --test test/api-suite.js`) to test:
  1. `GET /api/worlds` — Returns world list and default world.
  2. `POST /api/articles` & `GET /api/articles/:id` — Article CRUD with dual-sync disk verification.
  3. `POST /api/categories` & `GET /api/categories` — Category counts.
  4. `GET /api/worlds/:worldId/relationships` — Relationship matrix API.
  5. `POST /api/ai/assist` — AI assistant endpoint fallback handling.
  6. `GET /api/maps` — Map list API.

---

## 2. Arthur's Design Interrogation & Gate 1 Auto-Pass

> **Arthur**: *"Does `saveArticleWithDiskSync` handle special characters in article titles when building local Markdown filenames?"*
> 
> **Alex (Dev)**: *"Yes. Filenames are sanitized using `title.toLowerCase().replace(/[^a-z0-9_-]/gi, '_')` to prevent invalid characters in file paths."*
> 
> **Riley (QA)**: *"What happens when `npm test` is run?"*
> 
> **Alex (Dev)**: *"We update `package.json` script `"test": "node --test test/api-suite.js"` so any developer or CI run executes the test suite instantly."*

**Arthur's Verdict**: PASSED (Auto-Approved for Stage 3).
