# LoreVault Design Spec: Comprehensive UI/UX & Context Suite Enhancements

**Date**: 2026-07-31  
**Author**: Antigravity Agent (Collaborating with Alex Vance, Maya Lin, Morgan, Elena, Ethen)  
**Status**: Approved  

---

## 1. Executive Summary & Product Alignment (Ethen — Product Owner)

This specification defines 5 high-impact UI/UX and workflow enhancements designed to eliminate remaining user friction, elevate writing immersion, and streamline AI context assembly across all persona workflows.

---

## 2. Technical Architecture & Component Specifications (Alex Vance Directives)

### 2.1 📖 Zen Reader / Focus Mode (`#view-library.zen-mode`)
- **UI Trigger**: `[📖 Focus Mode]` button in the article detail toolbar ([index.html](file:///c:/Users/EthenGreening/.gemini/antigravity/scratch/lore-vault/public/index.html#L128)) + Keyboard shortcut (`Ctrl + Shift + F`).
- **Layout Mechanics**: Toggles `.zen-mode` class on `.view-panel`. Smoothly collapses `.sidebar` and `.article-list-column` while centering the reader pane (`max-width: 850px`, line-height `1.7`) for distraction-free fiction writing and lore reading.

### 2.2 `@` Cross-Link Auto-Complete Tooltip (`#crosslink-popover`)
- **UI Trigger**: Typing `@` inside `#edit-content` textarea or slate editor.
- **Behavior**: Opens a floating popover displaying matching vault articles with category badges. Arrow key navigation (`Up`/`Down`) + `Enter`/`Tab` inserts WorldAnvil syntax `@[Article Title](id)`.

### 2.3 📊 Visual Token Capacity Gauge (`#token-budget-bar`)
- **Location**: Top of Weave Matrix Context Compiler ([index.html](file:///c:/Users/EthenGreening/.gemini/antigravity/scratch/lore-vault/public/index.html#L236)).
- **State Logic in `context-builder.js`**:
  - Dynamic token calculation based on active slate payload.
  - Visual progress bar with color tiers:
    - 🟢 **Green** (0–70% capacity: `< 2,800 tokens`)
    - 🟡 **Amber/Gold** (70–90% capacity: `2,800 – 3,600 tokens`)
    - 🔴 **Red Glow** (> 90% capacity: `> 3,600 tokens`)
  - Displays formatted count: `2,450 / 4,096 tokens (60% used)`.

### 2.4 🗺️ Interactive Graph Category Node Filters (`#graph-category-filters`)
- **Location**: Above Knowledge Graph canvas in `public/js/graph-view.js`.
- **Behavior**: Filter chips (`[All]` `[Characters]` `[Races & Species]` `[Locations]` `[Factions]` `[Magic & Tech]` `[History]` `[Items]`) dynamically filter graph nodes and update physics simulation without full canvas re-creation.

### 2.5 🎬 `+ Add to Active Scene Slate` Reader Action Button (`.btn-add-to-slate`)
- **Location**: Article Reader Action Bar in `public/js/app.js` (`renderArticleViewer`).
- **Behavior**: Pushes current article directly into `ContextBuilder` active context tray and renders a visual toast notification (`Added "Title" to Scene Slate!`).

---

## 3. Verification & Testing Strategy

- Component test scripts created in `scratch/`:
  - `scratch/test-zen-reader.js`
  - `scratch/test-crosslink-popover.js`
  - `scratch/test-token-gauge.js`
  - `scratch/test-graph-filters.js`
  - `scratch/test-add-to-slate.js`
- Full E2E master suite executed to ensure 100% green pass.
