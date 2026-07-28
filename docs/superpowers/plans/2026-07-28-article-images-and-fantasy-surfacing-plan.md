# Article Image Management, Fantasy Surfacing & Lightbox Engine Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Provide full image management for LoreVault articles including local file uploads, drag-and-drop auto-insertion, hero cover banners, AI image prompt generation, fantasy filigree image cards, and an interactive full-screen Lightbox viewer.

**Architecture:** Backend `POST /api/upload/image` endpoint utilizing `multer` saving files to `public/uploads/images/`. Database `articles` table updated with `header_image` column. Frontend drag-and-drop listener on article textarea automatically posting dropped images and inserting `[img]/uploads/images/...[/img]`. `wa-parser.js` enhanced to transform image tags into fantasy-framed cards with alignment and captions.

**Tech Stack:** Express.js, Multer, Vanilla JS, CSS Variables (`--border-filigree`), HTML5 Drag & Drop API.

## Global Constraints
- Pure CSS & Vanilla JavaScript.
- Full WorldAnvil & Markdown image tag compatibility (`[img]`, `![alt](url)`).
- Safe file upload handling (10MB limit, image MIME type validation).

---

### Task 1: Backend Image Upload API & Database Schema Extension

**Files:**
- Modify: `server.js`

**Interfaces:**
- Consumes: `multer` middleware.
- Produces: `POST /api/upload/image` returning `{ url: "/uploads/images/filename.jpg" }`. SQLite `articles` table schema with `header_image` column.

- [ ] **Step 1: Configure `multer` disk storage in `server.js`**
Set destination to `public/uploads/images/`, create directory if missing, and define collision-resistant timestamp filename generator.

- [ ] **Step 2: Add `POST /api/upload/image` endpoint**
Handle single file upload field `image`, validate image MIME types (`image/jpeg`, `image/png`, `image/webp`, `image/gif`, `image/svg+xml`), and return `{ url, filename }`.

- [ ] **Step 3: Add `header_image` database column migration & API update**
Execute `ALTER TABLE articles ADD COLUMN header_image TEXT` migration on server startup. Update `GET /api/articles/:id`, `POST /api/articles`, and `PUT /api/articles/:id` to read and save `header_image`.

- [ ] **Step 4: Commit**
`git add server.js`
`git commit -m "feat: add image upload endpoint and article header_image database schema"`


### Task 2: Editor UI: Hero Cover Banner Field, Toolbar, Drag & Drop & AI Prompt Generator

**Files:**
- Modify: `public/index.html`
- Modify: `public/js/app.js`

**Interfaces:**
- Consumes: `/api/upload/image` API endpoint.
- Produces: Article Editor Cover Image input, Toolbar "🖼️ Image" button, Drag & Drop upload handler on article textarea, and AI Image Prompt helper button.

- [ ] **Step 1: Add Cover Image field and AI Prompt helper to Article Editor in `index.html`**
Add `#article-header-image-input`, `#upload-header-image-btn`, and `#ai-image-prompt-btn` at the top of `#article-editor-modal`.

- [ ] **Step 2: Add Drag & Drop listener to article textarea in `app.js`**
Attach `dragover`, `dragleave`, and `drop` handlers to `#article-content-input`. Automatically upload dropped image files and insert `[img]/uploads/images/filename.ext[/img]` at cursor position.

- [ ] **Step 3: Implement `uploadArticleImage()`, `uploadHeaderImage()`, and `generateAIImagePrompt()` in `app.js`**
Connect file picker uploads and implement AI prompt builder helper that creates detailed Midjourney / DALL-E fantasy prompts based on article title and category.

- [ ] **Step 4: Commit**
`git add public/index.html public/js/app.js`
`git commit -m "feat: implement article cover image inputs, drag-and-drop editor upload, and AI prompt helper"`


### Task 3: WAParser Image Alignment Parsing & Fantasy CSS Styling

**Files:**
- Modify: `public/js/wa-parser.js`
- Modify: `public/css/styles.css`

**Interfaces:**
- Consumes: `[img]`, `[img align="..."]`, `![caption](url)`, `![caption|align](url)`.
- Produces: Formatted fantasy image cards with filigree borders, alignment wrapping, and Hero Cover Banner overlay.

- [ ] **Step 1: Enhance `wa-parser.js` image parsing**
Parse `align` (`left`, `right`, `center`, `full`), `width`, and `caption` parameters into `<figure class="wa-image-card align-...">` with `<figcaption>`.

- [ ] **Step 2: Add Fantasy Hero Banner & Image Card CSS to `styles.css`**
Add `.wa-article-banner` (top cover banner with gradient parchment mask and filigree trim), `.wa-image-card` (gold leaf / cyan filigree border, dark parchment background), `.align-left` (float left text wrap), `.align-right` (float right text wrap), and `.align-center`.

- [ ] **Step 3: Commit**
`git add public/js/wa-parser.js public/css/styles.css`
`git commit -m "style: implement fantasy article hero banner, filigree image cards, and alignment parsing"`


### Task 4: Interactive Full-Screen Lightbox Zoom Viewer

**Files:**
- Modify: `public/index.html`
- Modify: `public/js/app.js`
- Modify: `public/css/styles.css`

**Interfaces:**
- Consumes: Image click events on `.wa-image`.
- Produces: Lightbox modal displaying high-res image, filigree frame border, caption bar, and keyboard/click close handlers.

- [ ] **Step 1: Add Lightbox Modal markup to `index.html`**
Create `#article-image-lightbox` modal with `#lightbox-img`, `#lightbox-caption`, and close button.

- [ ] **Step 2: Add `openImageLightbox(src, caption)` and `closeImageLightbox()` to `app.js`**
Attach global window methods and ESC key listener (`KeyboardEvent.key === 'Escape'`).

- [ ] **Step 3: Add Lightbox CSS to `styles.css`**
Style backdrop blur, zoomable image frame, gold/cyan filigree border, and caption bar.

- [ ] **Step 4: Commit**
`git add public/index.html public/js/app.js public/css/styles.css`
`git commit -m "feat: implement interactive full-screen fantasy lightbox image viewer"`
