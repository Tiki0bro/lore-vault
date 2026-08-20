# Stage 3: Implementation Plan — AI Fight Simulator Engine

## Task Breakdown & Order of Implementation

### Task 1: Backend Combat Simulator REST API ([server.js](file:///c:/Users/EthenGreening/.gemini/antigravity/scratch/lore-vault/server.js))
- Implement `POST /api/ai/simulate-fight` endpoint in `server.js`.
- Add server-side dice combat loop (Initiative, Attack vs AC, Damage, Nat 20 crits, 30-round max cap).
- Integrate `callGeminiApi()` fallback model retries for cinematic battle prose generation with `no_generate_mode` check.

### Task 2: Frontend Gladiator Arena Modal ([public/index.html](file:///c:/Users/EthenGreening/.gemini/antigravity/scratch/lore-vault/public/index.html) & [public/js/app.js](file:///c:/Users/EthenGreening/.gemini/antigravity/scratch/lore-vault/public/js/app.js))
- Add `#fight-simulator-modal` dialog with combatant selectors, weapon equipment inputs, environment chips, and results container.
- Add navbar action button `⚔️ Fight Simulator` to tools menu.
- Add `openFightSimulatorModal()`, `populateCombatantFromStatblock()`, `runFightSimulation()`, and `copyCombatLog()` in `app.js`.

### Task 3: UI Micro-Interactions & Health Bar Duel Styling ([public/css/styles.css](file:///c:/Users/EthenGreening/.gemini/antigravity/scratch/lore-vault/public/css/styles.css))
- Add CSS rules for `#fight-simulator-modal`, `.arena-combatant-card`, `.hp-bar-container`, `.hp-bar-fill`, and victory banner animations across dark and light themes.

### Task 4: Automated Integration Test Suite ([test/api-suite.js](file:///c:/Users/EthenGreening/.gemini/antigravity/scratch/lore-vault/test/api-suite.js))
- Add automated integration tests verifying `POST /api/ai/simulate-fight` returns HTTP 200, valid winner, turn log, and respects `no_generate_mode`.
