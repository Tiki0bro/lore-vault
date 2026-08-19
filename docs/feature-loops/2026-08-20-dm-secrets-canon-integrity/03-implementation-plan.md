# Stage 3: Implementation Plan & Team Validation
**Feature**: DM Secrets & Canon Integrity Suite (`dm-secrets-canon-integrity`)  
**Date**: 2026-08-20  
**Status**: Gate 2 Passed (Arthur Socratic Pass - Auto Mode)

---

## 1. Step-by-Step Task Breakdown

1. **Parser & Backend Implementation** (`public/js/wa-parser.js` & `server.js`):
   - Add `[secret]` tag parsing rules in `wa-parser.js`.
   - Add backend `sanitizeSecretBBCode(text)` helper in `server.js`.
   - Update `GET /api/articles` and `GET /api/articles/:id` to check `req.query.mode === 'player'` and strip secret content.
   - Add `POST /api/audit/scan-secrets` audit endpoint.
2. **Frontend UI Integration** (`public/index.html` & `public/js/app.js`):
   - Add `#dm-mode-toggle` in navbar.
   - Add toolbar button in article editor.
3. **Automated Integration Tests** in `test/api-suite.js`.
