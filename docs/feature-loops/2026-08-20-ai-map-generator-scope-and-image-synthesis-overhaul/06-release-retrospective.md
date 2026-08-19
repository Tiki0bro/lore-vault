# Stage 6: Release Retrospective & Memory Log
**Feature**: AI Map Generator Scope Calibration & Multi-Provider Image Synthesis Overhaul
**Date**: 2026-08-20
**Feature Loop Directory**: `docs/feature-loops/2026-08-20-ai-map-generator-scope-and-image-synthesis-overhaul/`

---

## 📝 Key Post-Mortem & Decision Memory Log

1. **DOM Active Element Extraction at Submit Time**:
   - Always extract `.gen-scope-card.active` and `.gen-style-chip.active` directly inside `submitGeneratorModal()` to guarantee user selections are never overridden by fallback default variables.
2. **Single Target Pin Centering**:
   - When a user generates a map focused on 1 location article (`selectedArticleIds.length === 1`), pin placement MUST lock to `(0.50, 0.50)` centered on the canvas, eliminating random pin scatter across local maps.
3. **Dedicated Scope Prompt Directives**:
   - `battlemap` scope requires explicit `Top-down 2D tactical combat battlemap grid, overhead 90-degree angle view` keywords to prevent AI models from rendering macro geographical continents.
