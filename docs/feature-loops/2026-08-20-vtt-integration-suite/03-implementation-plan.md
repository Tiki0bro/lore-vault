# Stage 3: Implementation Plan — VTT Integration Suite

## Task Breakdown & Order of Implementation

### Task 1: Backend VTT REST API Endpoints ([server.js](file:///c:/Users/EthenGreening/.gemini/antigravity/scratch/lore-vault/server.js))
- Implement `GET /api/vtt/foundry/actors/:id` (Foundry Actor JSON serializer for D&D 5e / PF2e).
- Implement `GET /api/vtt/foundry/scenes/:mapId` (Foundry Scene JSON serializer with scaled grids and pins).
- Implement `GET /api/vtt/foundry/journals/:articleId` (Foundry Journal Entry serializer).
- Implement `POST /api/vtt/export/roll20` (Roll20 Handouts and macro string converter).
- Implement `POST /api/vtt/export/fgu` (Fantasy Grounds Unity XML exporter).
- Implement `POST /api/vtt/validate-schema` (Payload validator & secret filter).

### Task 2: Frontend VTT Export Modal ([public/index.html](file:///c:/Users/EthenGreening/.gemini/antigravity/scratch/lore-vault/public/index.html) & [public/js/app.js](file:///c:/Users/EthenGreening/.gemini/antigravity/scratch/lore-vault/public/js/app.js))
- Add `#vtt-export-modal` container to HTML with segmented target platform buttons (`Foundry`, `Owlbear`, `Roll20`, `Fantasy Grounds`).
- Add navbar action button `🎲 VTT Export` and `Ctrl + Shift + V` hotkey listener in `app.js`.
- Add copy clipboard and file download handler methods.

### Task 3: Owlbear Rodeo 2.0 Iframe Extension Page ([public/vtt/owlbear.html](file:///c:/Users/EthenGreening/.gemini/antigravity/scratch/lore-vault/public/vtt/owlbear.html))
- Create standalone HTML page loading `@owlbear-rodeo/sdk`.
- Build live search, statblock roller, and canvas item drop dispatcher.

### Task 4: UI/UX Micro-Interactions & Styling ([public/css/styles.css](file:///c:/Users/EthenGreening/.gemini/antigravity/scratch/lore-vault/public/css/styles.css))
- Style `.vtt-platform-card`, `.vtt-export-preview`, and modal controls following LoreVault parchment dark/light design system.

### Task 5: Automated Integration Test Suite ([test/api-suite.js](file:///c:/Users/EthenGreening/.gemini/antigravity/scratch/lore-vault/test/api-suite.js))
- Add automated integration tests verifying HTTP 200 responses, schema structure, secret stripping (`?mode=player`), and statblock conversion.
