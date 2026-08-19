# Stage 2: Design Specification & Gap Remediation
**Feature**: DM Secrets & Canon Integrity Suite (`dm-secrets-canon-integrity`)  
**Date**: 2026-08-20  
**Status**: Gate 1 Passed (Arthur Socratic Pass - Auto Mode)

---

## 1. BBCode Syntax & Parser Specification
- Syntax: `[secret]DM Secret content...[/secret]`
- In **DM Mode**: Parsed into styled `.wa-dm-secret` parchment box with red lock icon (`🔒 DM Secret`).
- In **Player Mode**: Completely stripped or replaced with empty string by `wa-parser.js` client-side and `sanitizeSecretBBCode()` server-side.

---

## 2. API & Audit Endpoints

### `GET /api/articles` & `GET /api/articles/:id`
- Accepts `?mode=player`. When `mode=player`, strips all `[secret]...[/secret]` tags from `content` before returning.

### `POST /api/audit/scan-secrets`
- Scans articles in a world for unclosed `[secret]` tags or accidental leaks in public excerpts.

---

## 3. UI Integration
- Navbar Mode Toggle `#dm-mode-toggle` (`🔒 DM Mode` vs `👁️ Player View`).
- Editor toolbar quick button `🔒 Secret` inserting `[secret] [/secret]`.
