# Stage 1: Ideation & Stage 2: Spec & Stage 6: Retrospective

**Feature Title**: Biome & Living Ecology Simulator: Trophic Webs & Resource Scarcity
**Date**: 2026-08-21
**Status**: RELEASED & VERIFIED

---

## 👥 Persona Synthesis & Architecture
- 🤖 **Grant (AI Novelist)**: "Simulate living ecosystems with trophic food webs and environmental pressures."
- 🎨 **Maya (UI/UX)**: "Clean visual card layouts mapping biomes to resources and scarcity factors."
- 🔍 **Arthur Vance**: "Ensure scarcity calculations model real economic and conflict vectors between regions."

## 📐 Schema & API Deliverables
- Relational tables: `world_biomes`, `world_species`.
- Endpoints:
  - `GET /api/worlds/:worldId/biomes` & `POST /api/biomes` & `DELETE /api/biomes/:id`
  - `GET /api/worlds/:worldId/trophic-web` & `POST /api/species` & `DELETE /api/species/:id`
  - `POST /api/ecology/simulate-scarcity`
  - `POST /api/ecology/generate-creature`
- Frontend: `#ecology-simulator-modal`, scarcity conflict visualizer, species web mapper.

## 🧪 Verification
- Verified by passing integration test in `test/api-suite.js`.
