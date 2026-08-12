# LoreVault Design Spec: Category UX & Intuitive Navigation Redesign

**Date**: 2026-07-31  
**Author**: Antigravity Agent (Collaborating with Maya Lin, Ethen, Alex)  
**Status**: Approved  

---

## 1. Overview & Objectives

This specification addresses user navigation friction caused by native HTML `<select>` dropdowns and vertical category sidebar scrolling. By replacing clunky form elements with an intuitive **Visual Category Dock**, **Segmented Control Buttons**, and a **Contextual Sub-Category Bar**, LoreVault provides instant, fluid category navigation without World Anvil's heavy cognitive load.

---

## 2. UI/UX Architecture & Components (Maya Lin Directives)

```
+------------------------------------------------------------------------------------+
| 🛡️ LOREVAULT  [Lore Codex] [Narrative Slate] [Weave Matrix]    [⚙️ Tools] [+ New]  |
+------------------------------------------------------------------------------------+
| 👥 Characters (84) | 🧬 Races & Species (23) | 🏰 Locations (21) | 🔮 Magic & Tech (21)|
| 🛡️ Factions (8)    | 📜 History (4)          | 🗡️ Items (1)                            |
+------------------------------------------------------------------------------------+
| Sub-Categories: [All (23)] [Playable Lineages (14)] [Monsters (4)] [Beasts (3)] [✕] |
+------------------------------------+-----------------------------------------------+
| 🔎 Search articles...              | 📖 Elven High Lineage                         |
| +--------------------------------+ | Category: Races & Species                     |
| | 🧬 Elven High Lineage          | | Sub: Playable Races & Lineages                |
| | 👹 Shadow Drake                | | [quote]“Ancient as the stars...”            |
| +--------------------------------+ |                                               |
+------------------------------------+-----------------------------------------------+
```

### 2.1 Visual Category Dock Bar (`#category-dock-bar`)
- Positioned prominently above the article layout grid.
- Contains 7 visual category pills displaying SVG/emoji icons, primary labels, and interactive article count badges.
- Single-click selection toggles primary category filtering without opening dropdowns.

### 2.2 Segmented Control Component (`.segmented-control`)
- Replaces native `<select id="edit-category">`, `<select id="sort-select">`, and `<select id="chat-category-filter">` with custom-styled segmented button groups and popover chips.
- Uses theme CSS variables (`--accent-gold`, `--accent-blue`, `--bg-card`) to match `ancient-codex` and `scifi-fantasy` theme modes.

### 2.3 Contextual Sub-Category Bar (`#sub-category-bar`)
- Slides in smoothly directly beneath the Category Dock Bar when a category is selected.
- Renders sub-category pill chips with item counts (e.g. `[Playable Lineages (14)]`, `[Monsters (4)]`).
- Includes a dedicated `[✕ Clear Filter]` button to quickly return to all vault articles.

### 2.4 Omni-Search Badge Previews (`#search-results-dropdown`)
- Enhances global search results by adding inline category pill badges (`[Races & Species]`, `[Location]`) beside article titles for instant jump navigation.

---

## 3. Data Flow & State Integration

- State tracking in `public/js/app.js`:
  ```javascript
  this.navigationState = {
    selectedCategory: null,
    selectedSubCategory: null,
    searchQuery: '',
    sortBy: 'updated'
  };
  ```
- Triggering `selectCategory(cat)` updates the Category Dock active state, populates the Sub-Category Bar, and filters the article cards grid.

---

## 4. Verification & Testing Plan

### Automated Component & E2E Tests
- Run `scratch/test-category-ux.js` asserting DOM element rendering, active state toggling, and chip bar click handlers.

### Manual Verification
- Test category dock responsiveness, sub-category sliding animation, and theme switching across `ancient-codex` (Parchment) and `scifi-fantasy` (Aether) theme modes.
