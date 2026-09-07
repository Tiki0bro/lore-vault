# Design Specification — World Doctor Suite v4 Diagnostic Expansion

**Topic**: World Doctor Suite v4 Diagnostic Expansion (5 Advanced Diagnostic Features)  
**Date**: 2026-08-20  
**Status**: APPROVED DESIGN  

---

## 1. Overview

The **World Doctor Suite v4 Expansion** adds 5 specialized diagnostic engines to LoreVault's worldbuilding advisor:
1. **Timeline & Anachronism Auditor**: Detects date/era contradictions across historical chronologies.
2. **Faction Web & Alliance Tension Auditor**: Detects unresolved political triangle tensions across faction relations.
3. **DM Secret & Spoiler Leak Auditor**: Scans player-visible articles for secret stat block names and DM plot spoilers.
4. **Cross-World Lore Bleed Guard**: Flags articles referencing lore entries belonging to other world settings.
5. **Category Depth & Readability Heatmap**: Computes word count depth per category and flags underdeveloped setting areas.

---

## 2. Technical Specifications & Endpoints

### 2.1 Backend Extensions (`/api/audit/run`, `/api/audit/scan`)
Extended `/api/audit/run` to perform 5 new diagnostic checks:
- **Anachronism Check**: Cross-references `timeline_events` (year fields) against character birth/death dates or historical era bounds.
- **Faction Tension Check**: Queries `factions` and `relations` tables to discover alliance triangle paradoxes (`A <-> B` allied, `B <-> C` allied, but `A <-> C` hostile).
- **Spoiler Leak Check**: Cross-references public articles against secret statblocks (`is_secret = 1`) or secret tags to catch accidental player-facing leaks.
- **Cross-World Bleed Check**: Checks if article cross-links (`@[Title]` / `[[Title]]`) match titles existing exclusively in other `world_id` scopes.
- **Category Depth Heatmap**: Aggregates average word counts per category (`Locations`, `Characters`, `Factions`, `Magic Systems`, `History`, `Items`). Flags categories with average word count `< 150 words`.

### 2.2 Frontend UI Extensions (`public/index.html`, `public/js/app.js`)
- **New Tab Buttons**:
  - `⏳ Anachronisms (<span id="doctor-metric-anachronisms">0</span>)`
  - `⚔️ Faction Tensions (<span id="doctor-metric-tensions">0</span>)`
  - `🔒 Spoiler Leaks (<span id="doctor-metric-spoilers">0</span>)`
  - `🌐 Cross-World Bleed (<span id="doctor-metric-bleed">0</span>)`
- **Category Depth Heatmap Bar**: Displays visual word-count depth bars inside `#doctor-panel-overview`.

---

## 3. Verification Plan

1. **Automated Integration Tests (`test/api-suite.js`)**:
   - Test anachronism detection in `/api/audit/run`.
   - Test faction tension triangle auditing.
   - Test DM secret leak detection.
   - Test category depth heatmap calculations.
2. **Execution**: Run `npm test` and verify 100% green test execution.
