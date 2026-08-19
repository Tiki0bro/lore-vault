# Stage 2: Design Specification — VTT Integration Suite

## Executive Summary
This design specification defines the architecture, REST API contracts, UI components, and data converters for LoreVault's VTT Integration Suite. It enables seamless lore, map, and statblock integration across **Foundry VTT**, **Owlbear Rodeo 2.0**, **Roll20**, and **Fantasy Grounds Unity**.

---

## 1. REST API Contract & Endpoints

### 1.1 VTT Export & Document Endpoints (`server.js`)

1. `GET /api/vtt/foundry/actors/:id`
   - **Query Params**: `?mode=gm|player` (default `player`)
   - **Returns**: Foundry VTT Actor v11/v12 JSON compatible document.
   - **Fields**: `name`, `type: 'npc'`, `system: { attributes, hp, ac, stats, actions }`, `img`, `prototypeToken`.

2. `GET /api/vtt/foundry/scenes/:mapId`
   - **Query Params**: `?mode=gm|player` (default `player`)
   - **Returns**: Foundry VTT Scene JSON document.
   - **Fields**: `name`, `img`, `width`, `height`, `grid: { distance, units, size }`, `notes: [ map_pins converted to Journal Pins ]`, `drawings: [ map_territories ]`.

3. `GET /api/vtt/foundry/journals/:articleId`
   - **Query Params**: `?mode=gm|player` (default `player`)
   - **Returns**: Foundry VTT JournalEntry JSON document with pages (`text/markdown` or `text/html`).

4. `POST /api/vtt/export/roll20`
   - **Payload**: `{ article_ids: [], statblock_ids: [], map_ids: [], mode: 'player'|'gm' }`
   - **Returns**: `{ r20_handouts: [...], r20_macro_import: "..." }` formatted for Roll20 handout creation and ChatSetAttr/Mod script ingestion.

5. `POST /api/vtt/export/fgu`
   - **Payload**: `{ world_id: "...", mode: 'player'|'gm' }`
   - **Returns**: XML stream or `.mod` zip package download containing Fantasy Grounds `db.xml` and images.

6. `POST /api/vtt/validate-schema`
   - **Payload**: `{ target_vtt: 'foundry'|'owlbear'|'roll20'|'fgu', payload: {...} }`
   - **Returns**: `{ valid: true|false, errors: [...], sanitized_payload: {...} }`

---

## 2. Frontend Components & UI Spec

### 2.1 Unified VTT Export Manager Modal (`#vtt-export-modal`)
- **Location**: Triggered via `Ctrl + Shift + V` hotkey or toolbar `🎲 Export to VTT` button in [public/index.html](file:///c:/Users/EthenGreening/.gemini/antigravity/scratch/lore-vault/public/index.html).
- **Controls**:
  - Segmented VTT Target Selector: `[ 🛡️ Foundry VTT | 🐻 Owlbear Rodeo | 🎲 Roll20 | ⚔️ Fantasy Grounds ]`
  - Export Content Range: `[ Current Article | Active Map | World Bestiary | Full World Bundle ]`
  - Privacy Toggle: `[ 🔒 DM Private (Secrets Included) | 👁️ Public Player Mode (Sanitized) ]`
  - Action Buttons: `[ 📋 Copy JSON / Text | 💾 Download VTT Package | 🔗 Copy Owlbear Drawer URL ]`

### 2.2 Owlbear Rodeo 2.0 Iframe Drawer Extension (`/public/vtt/owlbear.html`)
- **Location**: Standalone HTML page in `/public/vtt/owlbear.html` designed to run in sandboxed iframe.
- **SDK**: Imports `@owlbear-rodeo/sdk` script.
- **Functionality**:
  - Live search bar connecting to `http://localhost:3000/api/articles`.
  - Quick Statblock Viewer with 1-click dice rolling.
  - `📌 Drag to Map`: Drag NPC statblocks onto Owlbear grid canvas, invoking `OWBEAR.scene.addItems()`.

---

## 3. Privacy & DM Secrets Enforcement
- All export controllers filter through `stripSecrets()` when `mode=player`.
- Removes `[secret]...[/secret]` blocks in text.
- Filters out pins with `is_secret = 1` and map layers designated for DM view only.
