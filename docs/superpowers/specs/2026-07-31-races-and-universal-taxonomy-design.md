# LoreVault Design Spec: Races & Species and Universal Sub-Category Taxonomy

**Date**: 2026-07-31  
**Author**: Antigravity Agent (Collaborating with Ethen, Maya, Alex, Morgan, Elena)  
**Status**: Approved  

---

## 1. Overview & Objectives

This specification enhances LoreVault's article taxonomy by introducing an explicit **Races & Species** category and expanding sub-category subsets across all **7 primary categories**. The goal is to provide worldbuilders, authors, and TTRPG Game Masters with a rich, intuitive classification hierarchy without creating UI dropdown clutter or layout overflow.

---

## 2. Competitive Benchmarking & Analysis (Product Owner: Ethen)

| Platform | Taxonomy Model | Strengths | Weaknesses | How LoreVault Compares |
|---|---|---|---|---|
| **World Anvil** | 20+ Rigid Article Templates (*Character*, *Location*, *Species*, *Spell*, *Vehicle*, *Myth*, etc.) | Deep domain-specific fields | High cognitive load ("Template Fatigue"); cluttered drop-down menus | **Superior Simplicity**: LoreVault distills 20+ templates into **7 core top-level categories** with 4 sub-category subsets per category. Fully compatible with WA export syntax `@[Title](template:id)`. |
| **Campfire Write** | Modular Feature Panels (*Characters*, *Locations*, *Magic*, *Timeline*) | Clean visual isolation | Lacks automated AI categorization | **AI-Powered**: LoreVault matches Campfire's modular feel while adding automatic AI classification scoring on import/scan. |
| **Kanka.io** | Entity-Type & Tag Hierarchy | Highly customizable | Requires extensive manual setup | **Zero Setup**: Pre-configured fantasy/sci-fi taxonomy ready out-of-the-box. |
| **Obsidian / Notion** | Flat Markdown Folders + Freeform Tags | Unlimited flexibility | No built-in worldbuilding structure; requires building custom schemas from scratch | **Local-First + Pre-Structured**: Combines local Markdown file storage with rich out-of-the-box worldbuilding categorization. |

---

## 3. Primary & Sub-Category Taxonomy Schema

Articles in LoreVault adhere to the following 7 primary categories (`category`) and 28 sub-category subsets (`sub_category`):

### 1. Characters (`category: "Characters"`)
- 👑 `Rulers & Nobility`
- 🔮 `Mages & Mystics`
- ⚔️ `Warriors & Officers`
- 👤 `Key Figures & Personages`

### 2. Locations (`category: "Locations"`)
- 🏙️ `Cities & Settlements`
- 🏰 `Fortresses & Strongholds`
- 🗺️ `Realms & Territories`
- 🌲 `Geography & Wilderness`
- 🏛️ `Landmarks & Ruins`

### 3. Factions (`category: "Factions"`)
- 👑 `Noble Houses & Dynasties`
- 🗝️ `Syndicates & Guilds`
- 🛡️ `Military Orders`
- 🏛️ `Organizations & Societies`

### 4. Races & Species (`category: "Races & Species"`) *(Renamed from "Species")*
- 🧬 `Playable Races & Lineages`
- 🐺 `Beasts & Creatures`
- 👹 `Monsters & Entities`
- 🌿 `Flora & Ecology`

### 5. Magic & Tech (`category: "Magic & Tech"`)
- 📜 `Spells & Incantations`
- 💎 `Arcane Artifacts & Catalysts`
- ⚙️ `Technology & Machinery`
- 🔮 `Magic Systems & Theories`

### 6. History (`category: "History"`)
- ⏳ `Eras & Ages`
- ⚔️ `Wars & Battles`
- 📜 `Treaties & Accords`
- 🌟 `Chronicles & Key Events`

### 7. Items (`category: "Items"`)
- 🗡️ `Weapons & Armaments`
- 🛡️ `Armor & Relics`
- 🧪 `Potions & Reagents`
- 💍 `Trinkets & Valuables`

---

## 4. Architectural & System Design

### 4.1 Database Migration & Schema Compatibility
- Startup database migration script in `server.js`:
  ```sql
  UPDATE articles SET category = 'Races & Species' WHERE category = 'Species';
  ```
- Retains `articles.category` (TEXT NOT NULL) and `articles.sub_category` (TEXT) columns in SQLite (`lore.db`).

### 4.2 Backend AI Smart Classifier (`server.js`)
- `smartCategorizeArticle(title, rawContent, filename)` updated to score title and content signals for `'Races & Species'` and determine sub-categories for all 7 primary categories.

### 4.3 UI Layout & Progressive Disclosure (Maya Lin Directive)
- **Sidebar Category Accordion**: Expandable tree nodes under `#category-list`. Clicking a category expands its 4 sub-category items.
- **Context-Aware Chip Strip**: Horizontal scrollable container above article cards (`.article-list-column`) displaying `[All]` + sub-category chips for the active category.
- **Zero-Overflow Layout**: `overflow-x: auto` with scroll snapping to prevent element overlap across desktop and laptop displays.

### 4.4 Data Flow & State Management (Alex Vance Directive)
- Unified filter state in `public/js/app.js`:
  ```javascript
  this.filterState = {
    category: null,     // e.g. 'Races & Species'
    subCategory: null,  // e.g. 'Playable Races & Lineages'
    tag: null,          // e.g. 'high-elf'
    searchQuery: ''
  };
  ```
- AI Context Builder (`public/js/context-builder.js`) serializes `'Races & Species'` into LLM prompt contexts seamlessly.

---

## 5. Verification Plan

### Automated Tests
- Run `node scratch/test-context-builder.js` and server API checks to ensure endpoints, article updates, and category filters return 200 OK without regressions.

### Manual Verification
- Test category switching, accordion expansion, and filter chip filtering in the UI across both `ancient-codex` (Parchment) and `scifi-fantasy` (Aether) themes.
- Test World Doctor scan to verify auto-categorization detection.
