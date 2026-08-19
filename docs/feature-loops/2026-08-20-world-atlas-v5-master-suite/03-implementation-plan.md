# Stage 3: Implementation Plan & Team Validation
**Feature**: World Atlas v5 Suite: Multi-Party Speed Controls, Minimap Pin Dots & AI Travel Encounter Synthesizer
**Date**: 2026-08-20
**Feature Loop Directory**: `docs/feature-loops/2026-08-20-world-atlas-v5-master-suite/`

---

## 🎯 Implementation Steps

### Task 1: REST Endpoint `POST /api/ai/travel-encounter` (`server.js`)
- [x] Implement AI travel encounter endpoint combining route context, landmarks, and terrain biomes.

### Task 2: Expedition Control Bar & Travel Speed Multipliers (`public/js/atlas-view.js`)
- [x] Add `travelSpeedMultiplier` property (`1.0`, `2.0`, `5.0`).
- [x] Add Play/Pause/Resume methods (`pauseExpedition()`, `resumeExpedition()`, `setExpeditionSpeed()`).

### Task 3: Minimap Pin Dots Overlay (`public/js/atlas-view.js`)
- [x] Implement `renderMinimapPinDots()` rendering mini pin SVG circles inside `#atlas-minimap`.

### Task 4: QA Verification Suite (`scratch/test-world-atlas-v5-master.js`)
- [x] Create verification test script testing AI travel encounter payload synthesis, speed multipliers, and minimap pin dot rendering.

---

## 🔍 Arthur's Implementation Plan Interrogation

- **Arthur**: *"Alex, pass or fail on speed multiplier math?"*
- **Alex**: *"Pass. Duration scales as `durationMs / speedMultiplier`, accelerating animation cleanly."*
- **Arthur**: *"Riley, how do we verify AI travel encounter fallback?"*
- **Riley**: *"We will run `scratch/test-world-atlas-v5-master.js` to assert valid response payload from `POST /api/ai/travel-encounter`."*

---

**Gate 2 Verdict**: APPROVED BY ARTHUR VANCE & DEV TEAM. Proceeding to Stage 4 (Execution & QA Verification).
