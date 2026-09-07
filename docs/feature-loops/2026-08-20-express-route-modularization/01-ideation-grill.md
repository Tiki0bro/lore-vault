# Stage 1: Persona Ideation & Initial Grilling — Express Route Modularization

## Feature Overview
- **Feature Name**: Express Route Modularization & Backend De-Monolithization
- **Target Release Date**: 2026-08-20
- **Lead Champion Personas**: 🎭 Alex Vance (Full-Stack Dev), 🧪 Riley Chen (QA Lead), 🔍 Arthur Vance (Socratic Architect)
- **Primary Goal**: Refactor `server.js` (8,245 lines) into cleanly separated, single-responsibility Express router files inside `src/routes/` while maintaining 100% backward compatibility, zero API breaking changes, and 33/33 passing automated integration tests.

---

## Targeted Router Modules

1. `src/routes/articles.js`: Article CRUD, Revision History, Statblocks, Disk Dual-Sync (`/api/articles/*`)
2. `src/routes/ai.js`: AI Assist, Fight Simulator, Concierge Routing, AI Config (`/api/ai/*`, `/api/concierge/*`)
3. `src/routes/vtt.js`: Foundry, Roll20, Fantasy Grounds Unity Export (`/api/vtt/*`)
4. `src/routes/atlas.js`: Maps, Map Pins, Routes, Tokens, Canvas Nodes (`/api/worlds/:worldId/maps`, `/api/canvas/*`)
5. `src/routes/audit.js`: Canon Doctor, Secret Scanner, Batch Repair, Diagnostics (`/api/audit/*`)
6. `src/routes/templates.js`: Custom Category Templates & Package Exchange (`/api/templates/*`)
7. `src/routes/simulation.js`: Era Simulation, Causality Audit, Rumors (`/api/simulation/*`)
8. `src/routes/worlds.js`: World CRUD, Relationships, Timeline, Export Bundle, Demo Seeder (`/api/worlds/*`, `/api/export/*`)

---

## 🔍 Arthur "The Griller" Vance's Socratic Interrogation

1. **Arthur**: *"Will refactoring `server.js` into sub-routers risk breaking middleware, database handles, or shared helper functions?"*
   - **Alex**: *"No; we create a shared helper module `src/services/db.js` or export helper functions (`callGeminiApiWithFallback`, `syncFileToStorage`, `extractCrossLinks`) so each router cleanly imports what it needs without circular dependencies."*
2. **Arthur**: *"How will we verify no routes were dropped or altered during refactoring?"*
   - **Riley**: *"We run the full 33-test automated integration test suite (`npm test`) before and after the refactor. Every single REST route has active coverage in `test/api-suite.js`."*
3. **Arthur**: *"What remains in `server.js`?"*
   - **Alex & Ethen**: *"`server.js` becomes the lightweight application entry point (~150 lines) initializing Express middleware, mounting the routers with `app.use()`, serving static files from `public/`, and starting `app.listen(PORT)`."*

---

## 👥 Persona Sign-Offs
- 🎭 **Alex (Dev)**: Approved (Clean 150-line `server.js` entry point).
- 🧪 **Riley (QA)**: Approved (Zero test regressions; 33/33 assertions).
- 🔍 **Arthur (Architect)**: Approved (Massive reduction in cognitive complexity & tech debt).
