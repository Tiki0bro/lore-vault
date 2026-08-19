# Stage 2: Design Spec & Gap Remediation Loop
**Feature**: World Atlas v5 Suite: Multi-Party Speed Controls, Minimap Pin Dots & AI Travel Encounter Synthesizer
**Date**: 2026-08-20
**Feature Loop Directory**: `docs/feature-loops/2026-08-20-world-atlas-v5-master-suite/`

---

## 🛠️ Technical Design Specification

### 1. Multi-Party Travel Speed Control Bar (`public/js/atlas-view.js` & `public/css/styles.css`)
- **Expedition Control Bar `#atlas-expedition-bar`**:
  - Glassmorphic floating control dock:
    - `▶️ / ⏸️ Play/Pause Toggle`
    - `🔄 Reset Position`
    - `1x` / `2x` / `5x` Speed Chips (`.travel-speed-chip`)
    - Token Icon Selector (Ship ⛵, Horse 🐎, Boots 🥾)
- **Velocity Interpolation**:
  - Multiply `elapsed` time delta by active `this.travelSpeedMultiplier` (default `1.0`, scaling to `2.0` or `5.0`).

### 2. Minimap Pin Overlay Dots (`public/js/atlas-view.js`)
- **SVG Overlay Container `#minimap-pin-svg`**:
  - Embedded inside `#atlas-minimap`.
  - On `initMinimap()` and `loadMapPins()`:
    - Renders `<circle>` elements for each visible pin with `cx="${pin.x_pct * 100}%"`, `cy="${pin.y_pct * 100}%"`, `r="3"`, `fill="${pin.pin_color}"`.

### 3. AI Travel Encounter Narrative Synthesizer (`server.js` & `public/js/atlas-view.js`)
- **REST API Endpoint `POST /api/ai/travel-encounter`**:
  - Input: `{ map_title, route_title, distance, unit, landmark_names, custom_directive }`.
  - Returns: `{ success: true, encounter_title, narrative_text }`.
- **UI Integration**:
  - Add `[🎲 AI Encounter Check]` button in expedition toast.
  - Renders modal dialog `#atlas-encounter-modal` showing read-aloud narrative text and D20 check DC.

---

## 🔍 Arthur's Line-by-Line Spec Interrogation

- **Arthur**: *"Grant, what if Gemini API key is missing when the DM clicks AI Encounter Check?"*
- **Grant**: *"We fall back to an atmospheric procedural encounter generator with biome-specific encounter tables (e.g. Bandits, Dire Wolves, Ancient Ruin Traps)."*
- **Arthur**: *"Alex, how do minimap pin dots update when pins are dragged or deleted?"*
- **Alex**: *"We call `renderMinimapPinDots()` inside `loadMapPins()` and pin `dragend` handlers."*

---

**Gate 1 Verdict**: APPROVED BY ARTHUR VANCE & TEAM. Proceeding to Stage 3 (Implementation Plan).
