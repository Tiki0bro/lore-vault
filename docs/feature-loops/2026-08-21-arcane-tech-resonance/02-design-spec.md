# Stage 2: Design Spec & Stage 3: Implementation Plan

**Feature Title**: Arcane & Tech Resonance Matrix: Hard-Law Constraint Engine
**Date**: 2026-08-21
**Mode**: Autonomous Fast-Track (`--auto`)

---

## 📐 Schema & API Design
- Database: `magic_tech_laws` (system_name, law_type, power_source, fuel_or_cost, forbidden_acts, backlash_consequences, tier_limits, is_secret).
- Endpoints:
  - `GET /api/worlds/:worldId/laws`
  - `POST /api/laws` & `DELETE /api/laws/:id`
  - `POST /api/laws/audit-article`
  - `GET /api/laws/:id/export/vtt`
- Frontend: `#magic-tech-modal`, rule definition form, active article audit inspector.
