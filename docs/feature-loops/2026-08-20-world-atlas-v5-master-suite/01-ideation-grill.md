# Stage 1: Persona Ideation & Initial Grilling
**Feature**: World Atlas v5 Suite: Multi-Party Speed Controls, Minimap Pin Dots & AI Travel Encounter Synthesizer
**Date**: 2026-08-20
**Feature Loop Directory**: `docs/feature-loops/2026-08-20-world-atlas-v5-master-suite/`

---

## 👥 Persona Panel & Objectives

1. **Multi-Party Speed Controls (`1x`, `2x`, `5x`) & Travel Control Bar** (Alex & Ethen):
   - Add floating travel control bar `#atlas-expedition-bar` with Play, Pause, Resume, Reset, and Speed multiplier buttons (`1x`, `2x`, `5x`).
2. **Minimap Pin Overlay Dots & Spatial Heatmap Radar** (Maya & Morgan):
   - Render mini pin dots inside `#atlas-minimap` matching category colors (Settlements, Dungeons, Fortresses) with live viewport tracking.
3. **AI Travel Encounter Narrative Synthesizer** (Grant & Elena):
   - Add `[🎲 AI Encounter Generator]` on travel toasts querying Gemini AI for 2-paragraph read-aloud encounter seeds tailored to surrounding terrain and landmarks!

---

## 🔍 Arthur's 5-Whys Interrogation & Architecture Guarantees

1. **How do speed controls operate without breaking smooth animation?**
   - Speed multipliers (`1x`, `2x`, `5x`) modify the animation velocity variable `speedMultiplier` passed to `requestAnimationFrame`, smoothly accelerating token movement along route polylines.
2. **How are minimap pin dots rendered efficiently?**
   - Mini pin dots are rendered inside an SVG layer `#minimap-pin-svg` within `#atlas-minimap`, positioning dots at `(x_pct * minimapWidth, y_pct * minimapHeight)`.
3. **How does AI Travel Encounter Synthesizer assemble context?**
   - Endpoint `POST /api/ai/travel-encounter` combines current route title, landmark pins along the path, scale distance, and custom DM directives to query Gemini AI.

---

**Ideation Verdict**: APPROVED BY ARTHUR VANCE & PERSONA PANEL. Proceeding to Stage 2 (Design Spec).
