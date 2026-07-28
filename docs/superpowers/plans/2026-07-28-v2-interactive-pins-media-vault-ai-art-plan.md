# LoreVault Version 2.0 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver LoreVault Version 2.0 features: Interactive Map Pins, Visual Media Vault Manager, One-Click AI Concept Art Generator, Hero Banner Focal Point adjustment, and Multi-Image Gallery Grids.

**Architecture:** Express.js + SQLite `media` table backend. Modular SVG map pins rendered via `wa-parser.js` and `styles.css`. Visual Media Vault modal in `index.html` & `app.js`. `POST /api/ai/generate-art` endpoint for concept art generation.

**Tech Stack:** Express.js, SQLite3, Multer, Vanilla HTML/CSS/JavaScript, Google Fonts, SVG Icons.

## Global Constraints
- Pure CSS & Vanilla JavaScript.
- Full WorldAnvil & Markdown compatibility.
- Seamless performance and offline safety.

---

### Task 1: Media Vault Database Schema & REST API

**Files:**
- Modify: `server.js`

**Interfaces:**
- Consumes: SQLite database connection.
- Produces: `media` table schema (`id`, `filename`, `original_name`, `url`, `mime_type`, `size`, `world_id`, `created_at`). `GET /api/media`, `DELETE /api/media/:id`, auto-indexing on file upload.

- [ ] **Step 1: Add `media` table creation in `server.js`**
Define `CREATE TABLE IF NOT EXISTS media (...)` in database initialization block.

- [ ] **Step 2: Update `POST /api/upload/image` to insert record into `media` table**
Record `filename`, `url`, `size`, `mime_type`, and `world_id` on upload.

- [ ] **Step 3: Add `GET /api/media` and `DELETE /api/media/:id` endpoints**
List media items with optional `world_id` filtering and delete records + local files safely.

- [ ] **Step 4: Commit**
`git add server.js`
`git commit -m "feat(v2): add media vault database schema and REST API endpoints"`


### Task 2: Visual Media Vault Manager Modal

**Files:**
- Modify: `public/index.html`
- Modify: `public/js/app.js`
- Modify: `public/css/styles.css`

**Interfaces:**
- Consumes: `/api/media` REST API.
- Produces: Visual asset grid modal `#media-vault-modal` allowing users to search, preview, copy BBCode, and insert uploaded images into articles.

- [ ] **Step 1: Add Media Vault Modal markup to `index.html`**
Create `#media-vault-modal` with search input, world filter select, asset grid `#media-vault-grid`, and upload button. Add "🖼️ Media Vault" button to navbar and editor toolbar.

- [ ] **Step 2: Implement Media Vault logic in `app.js`**
Add `openMediaVault()`, `closeMediaVault()`, `fetchMediaAssets()`, `copyMediaBBCode(url)`, and `deleteMediaAsset(id)`.

- [ ] **Step 3: Add Media Vault CSS to `styles.css`**
Style thumbnail grid `.media-grid`, asset cards `.media-card`, and copy/delete buttons.

- [ ] **Step 4: Commit**
`git add public/index.html public/js/app.js public/css/styles.css`
`git commit -m "feat(v2): implement visual Media Vault manager modal"`


### Task 3: Interactive Map Pins Parser, Click-to-Pin Editor & Navigation

**Files:**
- Modify: `public/js/wa-parser.js`
- Modify: `public/js/app.js`
- Modify: `public/css/styles.css`
- Modify: `public/index.html`

**Interfaces:**
- Consumes: `pins` attribute on `[img]` tags.
- Produces: Visual pin overlay, click-to-pin editor mode in Article Editor, glowing SVG pin markers, and click navigation to lore articles.

- [ ] **Step 1: Enhance `wa-parser.js` map pin parser**
Parse `pins='[{"x":45,"y":60,"articleId":"...","label":"...","type":"city"}]'` into `.wa-map-container` and `.wa-map-pin` elements with SVG badge icons.

- [ ] **Step 2: Add Map Pin CSS styling to `styles.css`**
Style `.wa-map-container`, `.wa-map-pin` (glowing pulse ring animation, gold/cyan accent theme), tooltip cards `.wa-pin-tooltip`, and `👁️ Toggle Pins` button.

- [ ] **Step 3: Add Click-to-Pin Visual Editor mode in `app.js`**
Add "📍 Add Map Pins" button in Article Editor. Clicking on preview map image calculates relative coordinates `(x, y)` and prompts user to pick a target article and pin type (`city`, `battle`, `relic`, `nature`), auto-updating the `[img pins='...']` tag.

- [ ] **Step 4: Commit**
`git add public/js/wa-parser.js public/js/app.js public/css/styles.css public/index.html`
`git commit -m "feat(v2): implement interactive map pins, visual click-to-pin editor, and lore navigation"`


### Task 4: One-Click AI Concept Art Generation Engine

**Files:**
- Modify: `server.js`
- Modify: `public/index.html`
- Modify: `public/js/app.js`

**Interfaces:**
- Consumes: Article context & Gemini API / prompt engine.
- Produces: `POST /api/ai/generate-art` endpoint generating concept art images, saving to `/uploads/images/`, and auto-inserting into articles.

- [ ] **Step 1: Add `POST /api/ai/generate-art` in `server.js`**
Generate image prompt / artwork using AI model, save output image into `public/uploads/images/`, record in `media` database table, and return `{ url, filename }`.

- [ ] **Step 2: Add "🎨 Render AI Art" button and handler in `app.js`**
Connect toolbar button to post to `/api/ai/generate-art` and insert `[img align="center" caption="Concept Art"]${url}[/img]` into editor.

- [ ] **Step 3: Commit**
`git add server.js public/index.html public/js/app.js`
`git commit -m "feat(v2): implement one-click AI concept art generation engine"`


### Task 5: Hero Banner Focal Point Adjustment & Multi-Image Gallery Grids

**Files:**
- Modify: `public/js/wa-parser.js`
- Modify: `public/css/styles.css`
- Modify: `public/index.html`
- Modify: `public/js/app.js`

**Interfaces:**
- Consumes: `header_image_focal` field and `[gallery]` BBCode block.
- Produces: Vertical `object-position` hero banner alignment and side-by-side thumbnail gallery grids.

- [ ] **Step 1: Add Hero Banner Focal Point selector to Article Editor**
Add Focal Point select (`Top`, `Center`, `Bottom`, `30%`) to `#editor-modal` and apply `object-position: center var(--focal-y)` in `styles.css`.

- [ ] **Step 2: Implement `[gallery]` parser in `wa-parser.js`**
Parse `[gallery]url1|Caption1\nurl2|Caption2[/gallery]` into `.wa-gallery-grid` with side-by-side cards and Lightbox zoom triggers.

- [ ] **Step 3: Commit**
`git add public/js/wa-parser.js public/css/styles.css public/index.html public/js/app.js`
`git commit -m "feat(v2): implement hero banner focal point alignment and multi-image gallery grids"`
