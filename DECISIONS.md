# LoreVault Architectural Decisions Log (ADR)

This file records all major technical, architectural, and design decisions made for LoreVault. It serves as a persistent memory context for AI assistants and developers across sessions.

---

## 1. Core Stack & Architecture
- **Architecture**: Local-first single-page web app with Node.js/Express server and Vanilla JS/HTML/CSS frontend.
- **Storage Strategy**: Dual SQLite (`lore.db`) for relational metadata and local Markdown files (`/data/` or `/storage/`) for content preservation.
- **Map Layers & Territory Boundaries Schema**: Added `map_layers` and `map_territories` SQLite relational tables and CRUD REST endpoints in `server.js`, storing polygons as normalized percentage coordinate arrays (`[x_pct, y_pct]`) with DM secret filtering (`?mode=player`).
- **Interactive World Atlas v2 DB Schema & REST Endpoints**: Expanded `maps` (`parent_map_id`, `parent_pin_id`, `scale_pixels`, `scale_distance`, `scale_unit`) and `map_pins` (`target_sub_map_id`, `category`), created `map_routes` table, and added hierarchy tree resolution (`GET /api/maps/:mapId/tree`), scale calibration (`PUT /api/maps/:mapId/scale`), and route CRUD endpoints (`GET/POST/DELETE /api/maps/:mapId/routes`) with `?mode=player` secret filtering in [server.js](file:///c:/Users/EthenGreening/.gemini/antigravity/scratch/lore-vault/server.js).
- **Gemini Multimodal Vision Territory Auto-Detection**: Added `POST /api/maps/:mapId/ai-auto-boundaries` multimodal vision endpoint with Gemini candidate model retries, image/lore context prompt, smart fallback polygons, ghost overlay canvas rendering, and candidate approval drawer in `public/js/atlas-view.js`.
- **Expedition Route Drawing & Standalone HTML Exporter Upgrade**: Added interactive polyline route drawing mode (`map_routes`), real-time scale-calibrated route distance calculations, Foot/Horse/Sail travel estimators, route configuration modals, and updated `POST /api/export/atlas/:worldId` to generate offline standalone HTML bundles featuring routes, scale calibration, breadcrumb navigation, pin search, and sub-map hierarchy tree.




---

## 2. Article Formatting Standard (WorldAnvil Simplified)
All generated worldbuilding articles and templates MUST follow these exact rules:
1. **Thematic Quote**: `[quote]“Quote text” | — Source[/quote]`
2. **Header Layout**: `[row]` with two `[col]` elements.
   - Left Column: `[h1]Title[/h1]` followed by overview paragraph.
   - Right Column: `[h3]Sidebar Title[/h3]` followed by standard `[table]`.
3. **Table Formatting**: Plain text table headers only (**NO FontAwesome icons**).
4. **Sectioning**: `[hr]` divider, followed by `[h2]I. Section Name[/h2]`.
5. **Bold Details**: `[b]Label:[/b]` for key-value items.
6. **Cross-Links**: `[[Article Title]]` or `@[Title](template:id)` syntax.
7. **Clean Markup**: NO `[box]` or `[section]` container bloat.

---

## 3. AI & LLM Engine Integration
- **Config Storage**: AI credentials and model selection are persisted on disk at `config/ai-config.json`.
- **Model Fallback Loop**: Server implements automatic candidate retries (`gemini-flash-latest`, `gemini-2.0-flash`, `gemini-3.1-pro-preview`, `gemini-pro-latest`) to handle model deprecation or 404 errors.
- **Context Retrieval**: "Ask My World" searches the top 15 relevant vault articles via keyword stemming and passes them into Gemini prompts. Bypasses world filters when `world_id = 'all'`.

---

## 4. World Doctor & Audit Suite
- **Narrative Audit**: `POST /api/audit/deep-ai` evaluates cross-article timeline consistency, contradiction detection, and calculates a 0–100 World Health Score.
- **AI Harmonization**: `POST /api/audit/harmonize` resolves contradictions with side-by-side diff previews.
- **Stub Auto-Cure**: `POST /api/audit/flesh-out-stub` generates genre-tailored (High Fantasy, Dark Fantasy, Sci-Fi, Gothic) 2-paragraph WorldAnvil articles.

---

## 5. UI/UX & Theme Engine Directives
- **Dual World Theme Engine**:
  1. `ancient-codex`: **Ancient Parchment & Codex (Fantasy)** — Warm gold/amber filigree, dark parchment gradients, `Cinzel` & `Lora` serif typography, and rustic RPG borders.
  2. `scifi-fantasy`: **Sci-Fi & Aetherpunk (Cyberpunk / Futuristic)** — Cyan/neon blue accents, dark slate textures, crisp futuristic typography, and glowing borders.
- **Universal Scholar's Parchment Light Mode**: Added `data-mode="light"` CSS token system (`#faf6ed` ivory canvas, `#2c221e` espresso typography, `#d6c5a3` brass borders) with `#theme-mode-toggle` button in navbar. Mode preference persists in `localStorage` (`lorevault_mode`).
- **Segmented Control Buttons**: Upgraded native dropdown `<select>` controls to custom styled `.segmented-control` button groups (`.segmented-btn`), preserving hidden `<select>` elements for native form validation and backward compatibility.
- **Contextual Sub-Category Bar & 1-Click Clear Filter**: Added `#sub-category-bar` in [public/index.html](file:///c:/Users/EthenGreening/.gemini/antigravity/scratch/lore-vault/public/index.html) with smooth CSS slide transitions in [public/css/styles.css](file:///c:/Users/EthenGreening/.gemini/antigravity/scratch/lore-vault/public/css/styles.css). Dynamically renders sub-category chips with live article count badges and a 1-click `[✕ Clear Filter]` button (`window.app.clearCategoryFilters()`) in [public/js/app.js](file:///c:/Users/EthenGreening/.gemini/antigravity/scratch/lore-vault/public/js/app.js).
- **LoreVault v2 UI/UX & Context Suite**:
  1. **Zen Reader / Focus Mode**: Added `#zen-mode-toggle` toolbar button, `toggleZenMode()` method, `Ctrl + Shift + F` / `Escape` keyboard shortcuts, and `.zen-mode` layout CSS rules that collapse sidebars and expand reader column to 850px.
  2. **`@` Cross-Link Auto-Complete Tooltip**: Added floating `#crosslink-popover` in editor split with real-time `@` typing detection, fuzzy title search, keyboard navigation (`ArrowUp`/`ArrowDown`/`Enter`/`Tab`/`Escape`), and standard `@[Title](id)` insertion.
  3. **Visual Token Capacity Gauge**: Added `#token-budget-bar` inside Weave Matrix context compiler with live token percentage calculation against 4,096 cap, dynamic fill width, status label (`2,450 / 4,096 tokens (60% used)`), and 3-tier color glow states (`tier-green` <=70%, `tier-amber` 71-90%, `tier-red` >90%).
  4. **Interactive Knowledge Graph Node Filters**: Added `#graph-category-filters` container with 8 category filter chips (`All Nodes` + 7 primary categories) in `public/js/graph-view.js` that filter visible node datasets dynamically without canvas re-instantiation.
  5. **`+ Add to Scene Slate` Reader Action Button**: Added `#add-to-slate-btn` in article detail toolbar with real-time state sync (`+ Add to Slate` / `✓ In Slate`), pulse micro-animations (`slate-pulse-anim`), and 1-click slate toggle integration with Weave Matrix.
- **Interactive World Atlas & Dual Sharing Suite**: Added full-screen Leaflet.js cartography canvas (`#view-atlas`, [public/js/atlas-view.js](file:///c:/Users/EthenGreening/.gemini/antigravity/scratch/lore-vault/public/js/atlas-view.js)) with normalized float coordinates (`x_pct`, `y_pct` range 0.0–1.0), reticle pin dropping, article linking, DM Canon vs Public Player view toggle with automated `[secret]` text stripping, live web gateway (`GET /view/:shareToken` with OpenGraph social cards), and single-file standalone web bundle exporter (`POST /api/export/atlas/:worldId`).
- **Public World Wiki Portal & Frontpage Suite**: Upgraded `/view/:shareToken` and added `#view-frontpage` ([public/js/frontpage-view.js](file:///c:/Users/EthenGreening/.gemini/antigravity/scratch/lore-vault/public/js/frontpage-view.js)) rendering a cinematic world landing page inspired by award-winning World Anvil portals (Melior, Etheria). Features cover hero banner, tagline quote, genre badges, metrics dock, featured lore spotlight cards ("Bookcovers"), OpenGraph social cards, and `⚙️ Customize Frontpage` modal.
- **Dual-Engine Automated World Cartographer**: Added `POST /api/maps/auto-generate/procedural`, `POST /api/maps/auto-generate/ai`, and `POST /api/maps/:mapId/auto-pin` endpoints in [server.js](file:///c:/Users/EthenGreening/.gemini/antigravity/scratch/lore-vault/server.js). Implemented 2D Force-Directed Layout algorithm to eliminate coordinate pin stacking, Elevation-Biome Pin Snapping (*Harbors* ➔ Coastlines `0.38–0.42`, *Peaks/Citadels* ➔ Mountains `>0.70`), Spiral Grid-Collision Allocator, and `✨ Auto-Generate Map` / `📌 Auto-Place Pins` buttons in [public/js/atlas-view.js](file:///c:/Users/EthenGreening/.gemini/antigravity/scratch/lore-vault/public/js/atlas-view.js).
- **Atlas Floating Layer Control Panel**: Added `#atlas-layers-btn` and glassmorphic `#atlas-layers-drawer` container in [public/js/atlas-view.js](file:///c:/Users/EthenGreening/.gemini/antigravity/scratch/lore-vault/public/js/atlas-view.js) with color badges, DM secret locks (`🔒`), visibility toggles (`👁️`), custom layer CRUD modal, and live layer visibility filter during canvas rendering.
- **Offline Standalone Atlas Bundle Exporter with Layers & Territories**: Upgraded `POST /api/export/atlas/:worldId` in [server.js](file:///c:/Users/EthenGreening/.gemini/antigravity/scratch/lore-vault/server.js) to bundle `map_layers` and `map_territories` datasets, DM secret filtering (`is_secret = 0`), SVG pattern defs (`pattern-stripe`), and offline Leaflet client JS rendering in single-file HTML exports.
- **Zero Stubs & Event Delegation**: All navbar actions use persistent event delegation to eliminate dead buttons across re-renders.

---

## 6. Known Pitfalls & Post-Mortem Log ("Never Make the Same Mistake Twice")
*Agents MUST review this section before debugging or implementing similar components.*

- **[UI Event Delegation] Modal Buttons Unresponsive**:
  - *Symptom*: Clicking action buttons inside dynamically injected modal dialogs failed silently.
  - *Root Cause*: Event listener was bound to DOM element before modal insertion, or overwritten during re-render.
  - *Solution*: Use event delegation on parent container or attach listeners inside post-render callbacks (`public/js/app.js`).
- **[API / Model Routing] 404 / Deprecated Gemini Endpoint**:
  - *Symptom*: AI features failed with 404 or model deprecation errors.
  - *Root Cause*: Model string changed on upstream API.
  - *Solution*: Implemented candidate model retry loop in `server.js`. Always fall back across candidate models (`gemini-flash-latest`, `gemini-2.0-flash`, `gemini-3.1-pro-preview`, `gemini-pro-latest`).
- **[CSS / Theme Scope] Incomplete Light Mode Variable Overrides**:
  - *Symptom*: Toggling light mode only changed the left sidebar while leaving the navbar, knowledge graph canvas, category dock, and main background pitch black.
  - *Root Cause*: `[data-mode="light"]` defined separate alias variables (`--bg-primary`) instead of overriding the core foundational theme tokens (`--bg-main`, `--bg-dark`, `--bg-texture`, `--surface-card`, `--surface-sidebar`).
  - *Solution*: Map `[data-mode="light"]` directly to all core theme variables (`--bg-main`, `--surface-card`, `--surface-sidebar`, `--text-primary`, etc.) so all 4,000+ lines of component CSS automatically inherit light mode styling.
- **[HTML / DOM Hierarchy] Unclosed Element Nesting Corruption**:
  - *Symptom*: Article card list (`#articles-cards`) rendered inside `.list-header`, and the right detail viewer column (`.article-detail-column`) rendered inside `.article-list-column`, causing cards to disappear and layout to break.
  - *Root Cause*: Removing an unused child element (`#category-filter-chips`) accidentally deleted the closing `</div>` tag of `.list-header`, causing all subsequent DOM elements to be nested inside the header block.
  - *Solution*: Always verify HTML element closing tag symmetry during edits and validate parent-child element hierarchy in browser developer tools / integration tests.
- **[CSS / Theme Scope] Hardcoded Dark Color Tokens on Badges & Pills**:
  - *Symptom*: Sidebar item count badges (`.cat-count`) and article card tag pills (`.tag-pill`) remained dark slate blue (`#1e293b`) in Light Mode (`data-mode="light"`).
  - *Root Cause*: Hardcoded `#1e293b` color values were specified on base class selectors (`.category-menu .cat-count`, `.tag-pill`) instead of using CSS token variables (`var(--surface-card)`).
  - *Solution*: Replace hardcoded `#1e293b` hex values with token variables (`var(--surface-card)`) and add explicit Light Mode rules (`#eae0ce` parchment pills with `#7c6a5a` espresso text).
- **[JS / Async Lifecycle] Knowledge Graph Canvas Uninitialized on Load**:
  - *Symptom*: Scrolling down to the Knowledge Graph section at the bottom of the reader view showed an empty/blank container box without physics nodes.
  - *Root Cause*: `loadKnowledgeGraph()` was only invoked on manual tab switches instead of during initial `fetchArticles()` startup.
  - *Solution*: Trigger `this.loadKnowledgeGraph()` inside `fetchArticles()` post-fetch callback so graph nodes and links render immediately.
- **[CSS / Flex Layout] Zero-Height Container Collapse on Main View**:
  - *Symptom*: Lore Codex main screen rendered as a completely blank ivory background with missing middle card list and reader columns.
  - *Root Cause*: Setting `height: 0` on `.library-main-content` without an explicit height calculation on parent `#view-library.active` caused flex layout height to collapse to 0px.
  - *Solution*: Set `height: calc(100vh - 56px)` on `#view-library.active` and `height: 100%` on `.library-main-content` so columns fill the exact available viewport height without collapsing.
- **[CSS / Accordion Layout] Unconstrained Category Accordions Overflowing Main Layout**:
  - *Symptom*: Expanded category folders (e.g. `Characters 84`) stretched the middle column indefinitely, clipping adjacent category folders and pushing them off-screen.
  - *Root Cause*: `.article-list-group` inside `<details class="category-folder">` lacked a `max-height` cap and internal `overflow-y` scrollbar.
  - *Solution*: Apply `max-height: 380px`, `overflow-y: auto`, and `contain: content` to `details.category-folder[open] .article-list-group` in `public/css/styles.css`.
- **[CSS / Select Controls] Overlapping Native Arrow Icons on Custom Dropdowns**:
  - *Symptom*: Toolbar dropdown (`Move to World`) displayed multiple overlapping arrow icons (`v v v v v`), clipping button labels.
  - *Root Cause*: Component CSS overrode container background without `appearance: none`, causing browser default select arrows to stack with custom SVG icons.
  - *Solution*: Include `appearance: none; -webkit-appearance: none;` and explicit right padding on all `.toolbar-select` elements.
- **[CSS / Light Mode Scope] Hardcoded Dark Background on Editor Live Preview Container & Modal Controls**:
  - *Symptom*: In Light Mode (`data-mode="light"`), the live article preview pane (`.editor-preview-container`) in the Edit Lore Article modal rendered with a dark navy/black background (`#090d16`) while article text was dark espresso (`#2c221e`), rendering preview text unreadable. Unselected category chips (`.segmented-control-category .segmented-btn`) and toolbar buttons (`.tool-btn`) also remained dark slate (`#1e293b`).
  - *Root Cause*: `.editor-preview-container`, `.tool-btn`, and higher-specificity category button selectors lacked `[data-mode="light"]` CSS token overrides.
  - *Solution*: Added explicit `[data-mode="light"]` rules for `.editor-preview-container`, `.preview-title`, `.segmented-control-category .segmented-btn`, and `.tool-btn` in `public/css/styles.css`, and removed hardcoded dark inline background styles from `public/index.html`.
- **[UI / UX Polish & State Lifecycle] Ask My World Drawer Word Spacing & Minimize Pill Feature**:
  - *Symptom*: AI response bubbles had squished paragraph & word spacing, white text clipped in Light Mode headers, and title wrapped vertically ("Ask\nMy\nWorld\nAI").
  - *Root Cause*: Category filter chips inline in `.drawer-header` compressed title container down to ~40px wide and pushed `🗕` and `✕` buttons off-screen.
  - *Solution*: Separated `.drawer-header` into 2 distinct rows: Row 1 for title & action buttons (`.drawer-header-title` + `.drawer-header-actions`), and Row 2 (`.chat-category-bar`) with smooth horizontal scrolling for category filter chips in `public/index.html` and `public/css/styles.css`.
- **[API / Server Lifecycle] Stale Background Node Process Missing New Endpoints**:
  - *Symptom*: Uploading a map image failed with browser alert `Failed to upload map.`
  - *Root Cause*: Background Express process listening on port 3000 was started prior to adding the `POST /api/maps` endpoint, returning `404 Cannot POST /api/maps`.
  - *Solution*: Terminated stale PID on port 3000, restarted updated `server.js` process, and updated `public/js/atlas-view.js` to parse non-2xx HTTP responses and display exact error payload messages.
