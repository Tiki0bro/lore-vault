# Stage 6: Release Retrospective

**Feature Title**: Generative AI Hardening, Tonal Controls & Parsing Resilience
**Date**: 2026-08-20
**Mode**: Autonomous Fast-Track (`--auto`)
**Status**: COMPLETE

---

## 📈 Release Summary & Architectural Impact

1. **`safeExtractJSON` Parsing Resilience**:
   - Implemented `safeExtractJSON(text)` in `server.js` using boundary matching (`[` to `]` or `{` to `}`). Eliminates 500 errors when conversational intros accompany AI JSON responses in `/api/relationships/auto-extract` and `/api/relationships/spark-conflict`.
2. **Tonal Control Injection (`tone_preset`)**:
   - Expanded `/api/ai/assist` to support `tone_preset` (`grimdark`, `high_fantasy`, `cyberpunk`, `marketing_teaser`, `analytical_audit`) with automated tone directive injection into prompts.
3. **Merryn's `no_generate_mode` Guardrail**:
   - Implemented `no_generate_mode` check in `/api/ai/assist` returning HTTP `403 Forbidden` (`ERR_NO_GENERATE_MODE`) when generative prose actions are attempted under No-Generate Mode.
4. **Knowledge Graph Tag Preservation**:
   - Updated system prompts to preserve WorldAnvil cross-link tags (`@[Title](id)`).
5. **Integration Test Suite Verification (`npm test`)**:
   - Expanded `test/api-suite.js` to cover 9 core REST endpoints, achieving a 100% green pass rate across 9 tests.

---

## 📝 Architectural Decision Log Updates
- Updated `DECISIONS.md` with `safeExtractJSON`, `tone_preset`, and `no_generate_mode` AI conventions.
