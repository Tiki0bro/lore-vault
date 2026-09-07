# Stage 1: Ideation & Stage 2: Spec & Stage 6: Retrospective

**Feature Title**: Ethos & Vernacular Synthesizer: Cultural Dialects, Taboos & Proverbs
**Date**: 2026-08-21
**Status**: RELEASED & VERIFIED

---

## 👥 Persona Synthesis & Architecture
- 🎭 **Elena (Author)**: "Inject distinct linguistic registers, idioms, and greetings into dialogue."
- 📢 **Marcus (Marketing)**: "Export diegetic broadsheets and regional cultural lore snippets."
- 🔍 **Arthur Vance**: "Ensure cultural virtues and unforgivable taboos create actionable roleplay stakes."

## 📐 Schema & API Deliverables
- Relational table: `cultural_dialects` (culture_or_faction, linguistic_register, greetings_json, oaths_curses_json, proverbs_json, cardinal_virtues, taboos_forbidden, naming_conventions, is_secret).
- Endpoints:
  - `GET /api/worlds/:worldId/dialects` & `POST /api/dialects` & `DELETE /api/dialects/:id`
  - `POST /api/dialects/generate-slang`
  - `POST /api/dialects/translate-prose`
- Frontend: `#ethos-vernacular-modal`, dialect generator card, idiom & taboo inspector.

## 🧪 Verification
- Verified by passing integration test in `test/api-suite.js`.
