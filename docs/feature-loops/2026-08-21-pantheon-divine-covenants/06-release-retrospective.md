# Stage 1: Ideation & Stage 2: Spec & Stage 6: Retrospective

**Feature Title**: Pantheon & Divine Covenant Matrix: Deities, Piety & Astrological Omens
**Date**: 2026-08-21
**Status**: RELEASED & VERIFIED

---

## 👥 Persona Synthesis & Architecture
- 🧪 **Riley (QA Lead)**: "Deities and divine covenants must have deterministic piety thresholds, boons, and transgression curses."
- 👔 **Ethen (PO)**: "Interactive divine domain wheel and astrological omen forecast board."
- 🔍 **Arthur Vance**: "Connect celestial events (solstices, eclipses) to cosmic omens and divine interventions."

## 📐 Schema & API Deliverables
- Relational table: `world_deities` (name, domains, symbol_and_avatar, alignment, rival_deity_ids, allied_deity_ids, piety_boons_json, transgression_curses_json, astrological_omen_trigger, is_secret).
- Endpoints:
  - `GET /api/worlds/:worldId/pantheon` & `POST /api/deities` & `DELETE /api/deities/:id`
  - `POST /api/pantheon/simulate-omen`
  - `POST /api/pantheon/audit-piety`
- Frontend: `#pantheon-covenant-modal`, cosmic forecast viewer, deity domain manager.

## 🧪 Verification
- Verified by passing integration test in `test/api-suite.js` (including DM secret filtering under `?mode=player`).
