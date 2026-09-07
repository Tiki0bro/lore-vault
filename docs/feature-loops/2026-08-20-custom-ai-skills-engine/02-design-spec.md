# Stage 2: Design Spec & Gap Remediation Loop

**Feature Title**: Custom AI Skills & Formatting Rules Engine
**Date**: 2026-08-20

---

## 1. Feature Specifications

1. **SQLite Database Storage**: Table `ai_skills` `(id, world_id, name, description, directives, is_active)`.
2. **Backend API**: `GET /api/skills`, `POST /api/skills`, `DELETE /api/skills/:id`, and `POST /api/skills/generate`.
3. **Prompt Injection**: Injects active skill directives into `/api/ai/assist` and `/api/audit/flesh-out-stub`.
4. **UI Manager**: `#ai-skills-modal` with skill creation, active toggles, and AI Skill Generator modal.

---

## 🔥 Arthur's Grilling Sign-Off (Stage 2 Gate 1)
**Arthur's Verdict**: PASSED. Proceed to Stage 3 (Implementation Plan).
