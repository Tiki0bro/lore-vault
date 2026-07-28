# LoreVault Fantasy UI Redesign & Per-World Theme Engine Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform LoreVault into an immersive tabletop RPG worldbuilding studio with two distinct visual themes (*Ancient Parchment & Codex* and *Sci-Fi Fantasy / Aetherpunk*), RPG badge asset iconography, per-world database theme persistence, and strict WorldAnvil article formatting compliance.

**Architecture:** Database schema extended with `theme` field on `worlds`. CSS variables engine on `document.body[data-theme]` loaded via Google Fonts (*Cinzel*, *Lora*, *Orbitron*, *MedievalSharp*). Modular SVG RPG badge helper (`public/js/badges.js`) supplying framed badges for nav, categories, buttons, and World Doctor.

**Tech Stack:** Express.js, SQLite3, Vanilla HTML/CSS/JavaScript, Google Fonts, SVG Icon System.

## Global Constraints
- Pure CSS & Vanilla JavaScript (No React/Tailwind runtime overhead).
- Strict WorldAnvil formatting compliance: Plain text table headers, `[quote]`, `[row]`/`[col]`, `[h1]`, `[h2]`, `[hr]`, `[table]`, `[b]`, `@[Title](template:id)`.

---

### Task 1: Database Migration & Server Theme API Support

**Files:**
- Modify: `server.js`

**Interfaces:**
- Consumes: Existing SQLite database connection.
- Produces: `worlds` schema with `theme` column (`TEXT DEFAULT 'ancient-codex'`). `GET /api/worlds`, `POST /api/worlds`, `PUT /api/worlds/:id` handling `theme`.

- [ ] **Step 1: Check `server.js` for `worlds` schema and update table initialization**
Modify table creation SQL and run column check migration if missing `theme`.

- [ ] **Step 2: Update `POST /api/worlds` and `PUT /api/worlds/:id` endpoints**
Ensure `theme` parameter is parsed, validated (`'ancient-codex'` or `'scifi-fantasy'`), and persisted in SQLite.

- [ ] **Step 3: Run node server check / smoke test**
Execute server startup script or API query to verify schema migration succeeded without errors.

- [ ] **Step 4: Commit**
`git add server.js`
`git commit -m "feat: add per-world theme database column and API endpoints"`


### Task 2: CSS Theme System, Fonts & Fantasy Palette Tokens

**Files:**
- Modify: `public/index.html`
- Modify: `public/css/styles.css`

**Interfaces:**
- Consumes: Google Fonts (`Cinzel`, `Lora`, `MedievalSharp`, `Orbitron`, `Inter`).
- Produces: `[data-theme="ancient-codex"]` and `[data-theme="scifi-fantasy"]` root design tokens in `styles.css`.

- [ ] **Step 1: Import Fantasy Google Fonts in `index.html`**
Add `<link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@500;600;700;800;900&family=Lora:ital,wght@0,400;0,600;1,400&family=MedievalSharp&family=Orbitron:wght@600;800&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">`.

- [ ] **Step 2: Implement CSS Variable Themes in `styles.css`**
Define `--bg-main`, `--surface-card`, `--surface-card-hover`, `--border-filigree`, `--accent-primary`, `--accent-secondary`, `--text-primary`, `--text-secondary`, `--font-heading`, `--font-article-body` for both `ancient-codex` and `scifi-fantasy`.

- [ ] **Step 3: Update Base Container, Card, Header, Modal, and Button Styles**
Apply gold filigree borders, glassmorphism backdrop blurs, parchment textures, and glow effects to buttons, inputs, sidebars, and modals.

- [ ] **Step 4: Commit**
`git add public/index.html public/css/styles.css`
`git commit -m "style: implement fantasy theme tokens, typography, and card filigree borders"`


### Task 3: RPG SVG Badge Asset Library & Icon Integration

**Files:**
- Create: `public/js/badges.js`
- Modify: `public/index.html`

**Interfaces:**
- Consumes: SVG path definitions.
- Produces: `window.LoreBadges` module returning framed SVG badges for categories, navigation tabs, stat blocks, and action buttons.

- [ ] **Step 1: Create `public/js/badges.js` module**
Define SVG badge templates for:
- `scroll`: Library / Articles
- `quill`: Editor / Write
- `shield`: Factions / Studio / Conflict
- `crystal`: LLM Context Builder / AI Chat
- `healer`: World Doctor
- `compass`: World Selector & Locations
- `waxSeal`: Categories / Badges
- `gear`: AI Settings

- [ ] **Step 2: Update `index.html` header and button icon spans to use `LoreBadges`**
Replace plain emoji icons with calls to render high-resolution RPG badge frames.

- [ ] **Step 3: Commit**
`git add public/js/badges.js public/index.html`
`git commit -m "feat: implement SVG RPG badge asset library for UI iconography"`


### Task 4: Per-World Theme Engine & Client UI Logic

**Files:**
- Modify: `public/js/app.js`
- Modify: `public/index.html`

**Interfaces:**
- Consumes: `theme` property from world object.
- Produces: Dynamic `document.body.setAttribute('data-theme', theme)` on world switch, and theme picker input in World Create/Edit modal.

- [ ] **Step 1: Add Theme Selector dropdown to World Creation and World Editing modals in `index.html`**
Include options for "Ancient Parchment & Codex" (`ancient-codex`) and "Sci-Fi Fantasy (Aetherpunk)" (`scifi-fantasy`).

- [ ] **Step 2: Update `app.switchWorld(worldId)` in `public/js/app.js`**
Read `world.theme`, default to `'ancient-codex'` if unspecified, and set `document.body.setAttribute('data-theme', theme)`.

- [ ] **Step 3: Update World Save / Edit function to transmit `theme` in payload**
Ensure `POST /api/worlds` and `PUT /api/worlds/:id` send the selected `theme`.

- [ ] **Step 4: Commit**
`git add public/js/app.js public/index.html`
`git commit -m "feat: connect per-world theme switching and modal configuration"`


### Task 5: WorldAnvil Compliant Fantasy Article Renderer & Layout

**Files:**
- Modify: `public/css/styles.css`
- Modify: `public/js/wa-parser.js`

**Interfaces:**
- Consumes: WorldAnvil article text markup (`[quote]`, `[row]`, `[col]`, `[h1]`, `[h2]`, `[hr]`, `[table]`, `[b]`, `@[Title](template:id)`).
- Produces: Beautifully styled parchment article views with illuminated titles, gold top-line filigrees, styled blockquotes, two-column sidebars, and plain text table headers.

- [ ] **Step 1: Ensure `wa-parser.js` strips raw icon tags from table headers per standard**
Confirm `[th]` parser handles plain text headers without icon injection.

- [ ] **Step 2: Add fantasy article CSS styling to `styles.css`**
Add styles for `.wa-article-title` (Cinzel font, gold filigree border), `.wa-quote` (parchment card, crimson border-left, Lora font), `.wa-row`/`.wa-col` layout, `.wa-sidebar` (gold-bordered sidebar card), `.wa-table` (gold header line, dark parchment rows), and `.wa-section-h2` (illuminated header with hr separator).

- [ ] **Step 3: Verify article view rendering with sample article**
Render an article containing quotes, tables, and sidebars to verify theme styling in both `ancient-codex` and `scifi-fantasy` modes.

- [ ] **Step 4: Commit**
`git add public/css/styles.css public/js/wa-parser.js`
`git commit -m "style: enhance WorldAnvil article view with fantasy parchment styling and strict directive compliance"`
