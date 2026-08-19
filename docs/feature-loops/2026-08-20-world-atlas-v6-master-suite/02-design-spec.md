# Stage 2: Design Spec & Gap Remediation Loop
**Feature**: World Atlas v6 Master Suite: Map Pin Hover Cards, Chapter Storyboard Filter & AI Spatial Lore Auto-Expander
**Date**: 2026-08-20
**Feature Loop Directory**: `docs/feature-loops/2026-08-20-world-atlas-v6-master-suite/`

---

## 🛠️ Technical Design Specification

### 1. Map Pin Hover Cards & Quick-Preview Tooltips (`public/js/atlas-view.js`)
- **Rich Leaflet Tooltip Template**:
  - Update `renderPinsOnCanvas()`:
    - Construct glassmorphic HTML card for Leaflet `bindTooltip`:
      ```html
      <div class="atlas-pin-hover-card" style="padding:8px; width:220px;">
        <div style="font-weight:700; font-size:0.85rem; color:var(--accent-gold);">${pin.label}</div>
        <div style="font-size:0.75rem; color:var(--text-muted);">${category}</div>
        <div style="font-size:0.78rem; margin-top:4px; line-height:1.3; color:var(--text-primary);">${summary}</div>
      </div>
      ```
    - Options: `{ permanent: false, direction: 'top', className: 'atlas-tooltip-card' }`.

### 2. Novel Chapter Location Storyboard Filter (`public/js/atlas-view.js`)
- **Chapter Filter Bar `#atlas-chapter-filter`**:
  - Render chapter selector dropdown in toolbar: `[📖 All Chapters]`, `Chapter 1`, `Chapter 2`, `Chapter 3`...
  - `renderPinsOnCanvas()` filters pins matching selected chapter.
  - Renders polyline `this.chapterSequencePolyline` connecting chapter location pins in order of scene sequence.

### 3. AI Spatial Lore Auto-Expander for Unexplored Regions (`server.js` & `public/js/atlas-view.js`)
- **REST Endpoint `POST /api/ai/explore-region`**:
  - Input: `{ world_id, map_id, x_pct, y_pct, map_title }`.
  - Returns 3 location seeds: `[ { title: "Whispering Catacombs", category: "Dungeons", summary: "Ancient stone burial vaults below the mossy glade." }, ... ]`.
- **Canvas Context Action**:
  - Right-click map canvas in DM view: open popover `[✨ AI Explore Unexplored Region]`.
  - Present modal `#atlas-explore-modal` allowing DM to 1-click add location article and map pin at coordinates `(x_pct, y_pct)`.

---

## 🔍 Arthur's Line-by-Line Spec Interrogation

- **Arthur**: *"Morgan, how does the hover card get the article summary if the article hasn't been opened yet?"*
- **Morgan**: *"We search `this.articles` by `pin.article_id`. The summary snippet is cached on initial article load!"*
- **Arthur**: *"Elena, what happens if a chapter has no location pins tagged?"*
- **Elena**: *"We display a clean toast: 'No pins tagged to Chapter X yet. Click a pin to link scene locations!'"*

---

**Gate 1 Verdict**: APPROVED BY ARTHUR VANCE & TEAM. Proceeding to Stage 3 (Implementation Plan).
