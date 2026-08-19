# Stage 1: Persona Ideation & Initial Grilling — VTT Integration Suite

## Feature Overview
- **Feature Name**: LoreVault Virtual Tabletop (VTT) Integration Suite
- **Target Release Date**: 2026-08-20
- **Lead Champion Personas**: 🎨 Maya Lin (UI/UX), 🎭 Alex Vance (Dev), 🧪 Riley Chen (QA), 👔 Ethen (PO)
- **Primary Goal**: Provide local-first worldbuilders and DMs with seamless VTT integration across Foundry VTT, Owlbear Rodeo 2.0, Roll20, and Fantasy Grounds Unity, while enforcing DM secret privacy and schema validity.

---

## The 3 Feature Sub-Modules

### 1. Unified VTT Export Hub & Owlbear Rodeo Extension
- **Modal UI (`Ctrl + Shift + V`)**: A glassmorphic modal with segmented controls to export Articles, Statblocks, and Atlas Maps into VTT-compatible formats.
- **Owlbear Rodeo 2.0 Iframe Extension**: Sandboxed iframe served at `/public/vtt/owlbear.html` utilizing `@owlbear-rodeo/sdk` to render a live side panel inside Owlbear Rodeo rooms for searching lore and spawning tokens onto the battlemap.

### 2. Foundry VTT Live REST Sync Engine (`/api/vtt/foundry/...`)
- **Foundry Document Exporters**: `GET /api/vtt/foundry/actors/:id`, `GET /api/vtt/foundry/scenes/:mapId`, and `GET /api/vtt/foundry/journals/:id`.
- **Foundry Module Interface**: Native manifest & script (`lorevault-foundry`) for 1-click importing and updating Journal Entries, Actors, and Scenes directly inside Foundry VTT from LoreVault's `localhost:3000` REST API.

### 3. VTT Schema Sanitizer & DM Secret Filtering Pipeline
- **Validation REST Endpoints**: `POST /api/vtt/validate-schema` to verify JSON payloads before export.
- **DM Secret Safeguard**: Enforces `?mode=player` across all VTT export APIs, stripping `[secret]...[/secret]` blocks, hidden map layers, and unrevealed territory boundaries.

---

## 🔍 Arthur "The Griller" Vance's Socratic Interrogation

1. **Arthur**: *"Why build a full VTT integration suite instead of just telling users to copy-paste Markdown?"*
   - **Alex**: *"Manual copying breaks map scale, loses statblock dice formulas, and risks accidentally pasting DM secret text into public player handouts."*
2. **Arthur**: *"Roll20's API doesn't support external HTTP fetch calls. How do you plan to handle Roll20 without writing broken hacks?"*
   - **Riley**: *"We won't pretend Roll20 has a REST API. For Roll20, we export sanitized, self-contained JSON/Handout text blocks that DMs can copy with 1 click into Roll20 handouts or chat macros (`!lorevault-import`). Zero fragile network hacks."*
3. **Arthur**: *"What happens if a DM edits an article in LoreVault while playing in Owlbear Rodeo or Foundry VTT?"*
   - **Maya & Alex**: *"Owlbear's iframe drawer queries LoreVault's live local REST endpoints (`localhost:3000/api`), so search results and statblocks are always up-to-date in real-time."*
4. **Arthur**: *"Is DM secret privacy strictly enforced, or can a buggy VTT export leak hidden plot twists to players?"*
   - **Riley & Morgan**: *"Every VTT export route calls `stripSecrets()` and passes through `?mode=player` filtering by default unless the DM explicitly selects `mode=gm`."*

---

## 👥 Persona Sign-Offs
- 👔 **Ethen (PO)**: Approved (Balanced scope across top VTT platforms).
- 🧪 **Riley (QA)**: Approved (Schema validation & secret filtering guaranteed).
- 🎭 **Alex (Dev)**: Approved (REST endpoint architecture aligns with local Node/Express backend).
- 🎨 **Maya (UI/UX)**: Approved (Clean modal design & responsive Owlbear drawer layout).
