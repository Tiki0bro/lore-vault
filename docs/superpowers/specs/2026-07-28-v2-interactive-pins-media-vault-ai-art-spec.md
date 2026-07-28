# Spec: LoreVault Version 2.0 — Interactive Map Pins, Media Vault & AI Art Generator

**Date**: 2026-07-28  
**Status**: Approved  
**Aligned Personas**: Ethen (PO), Alex Vance (VTT Dev), Morgan "Gifford" Reed (Worldbuilder), Elena Rostova (Author)  

---

## 1. Executive Summary

LoreVault Version 2.0 introduces interactive world building capabilities:
1. **Interactive Map Pins (`[img-pins]`)**: Visual click-to-place location markers on world maps with tooltips, pin types, and VTT API export.
2. **Visual Media Vault Manager (`/api/media` & Modal)**: Asset gallery modal to browse, filter, search, copy links for, and clean up uploaded images.
3. **One-Click AI Concept Art Generator**: Generates fantasy character and location art using AI prompts and saves generated images directly to the Media Vault.
4. **Hero Banner Focal Point Adjuster**: Vertical alignment (`focal-y`) for header banners.
5. **Multi-Image Gallery Grids (`[gallery]`)**: BBCode grid layout for character art sets and location moodboards.

---

## 2. Feature Breakdown & Technical Design

### 2.1 Interactive Map Pins (`[img-pins]`)
- **Syntax**:
  ```text
  [img pins='[{"x":45.5,"y":62.0,"articleId":"obsidian-citadel","label":"Obsidian Citadel","type":"city"}]']
  /uploads/images/world-map.jpg
  [/img]
  ```
- **Pin Types**:
  - `city` (Castle/Crown icon)
  - `battle` (Crossed Swords icon)
  - `relic` (Crystal Gem icon)
  - `nature` (Mountain/Compass icon)
- **Editor Interaction**:
  - In Article Editor: A "📍 Map Pin Placement" mode overlay. Clicking on an image calculates relative percentage coordinates `(clickX / width * 100)` and `(clickY / height * 100)`, prompting to select a lore article from a dropdown and pick a pin category.
- **Article Viewer Rendering (`wa-parser.js` & `styles.css`)**:
  - Image is wrapped in `.wa-map-container` with relative positioning.
  - Pin markers `.wa-map-pin` rendered with glowing pulse animation rings.
  - Hovering displays a tooltip card; clicking navigates to the pinned article (`loadArticle(articleId)`).
  - Includes a `👁️ Toggle Pins` visibility button on top of the map image.

### 2.2 Visual Media Vault Manager (`/api/media` & Modal)
- **Database Schema (`media` table)**:
  ```sql
  CREATE TABLE IF NOT EXISTS media (
    id TEXT PRIMARY KEY,
    filename TEXT NOT NULL,
    original_name TEXT,
    url TEXT NOT NULL,
    mime_type TEXT,
    size INTEGER,
    world_id TEXT DEFAULT 'default',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  ```
- **Backend Endpoints (`server.js`)**:
  - `GET /api/media`: Lists all media files filtered by `world_id` or search query.
  - `DELETE /api/media/:id`: Deletes record and unlinks file from `public/uploads/images/`.
- **Frontend Modal (`#media-vault-modal`)**:
  - Accessible via "🖼️ Media Vault" button in navbar and editor toolbar.
  - Displays a grid of image thumbnails with search bar, copy BBCode button, and delete button.

### 2.3 One-Click AI Concept Art Generator
- **Backend Endpoint (`POST /api/ai/generate-art`)**:
  - Accepts prompt parameters, generates fantasy concept artwork (using Gemini/cloud or local AI plugin), saves output to `public/uploads/images/`, inserts into `media` table, and returns `{ url, filename }`.
- **Editor UI**:
  - "🎨 Render AI Art" button in editor toolbar triggers prompt generation, posts to endpoint, and auto-inserts `[img]/uploads/images/...[/img]` into article content.

### 2.4 Hero Banner Focal Point Alignment
- **Syntax**: `header_image_focal` field in SQLite `articles` table (e.g. `'center'`, `'top'`, `'30%'`).
- **CSS Rendering**: Applied as `object-position: center var(--focal-y, 30%);` on `.wa-article-banner img`.

### 2.5 Multi-Image Gallery Grids (`[gallery]`)
- **Syntax**:
  ```text
  [gallery]
  /uploads/images/art1.jpg | Character Variant A
  /uploads/images/art2.jpg | Character Variant B
  [/gallery]
  ```
- **Rendering**: Flex/Grid layout (`.wa-gallery-grid`) displaying side-by-side thumbnail cards with Lightbox click zoom triggers.

---

## 3. Verification & Testing Plan

1. **Map Pin Test**: Create an article with a map image, drop pins via click editor, and verify pin hover tooltips and click navigation in both `ancient-codex` and `scifi-fantasy` themes.
2. **Media Vault Test**: Upload images, open `#media-vault-modal`, search by filename, copy BBCode, and delete files.
3. **AI Art Generation Test**: Trigger AI art generation and confirm local file creation and auto-insertion into editor text.
4. **Gallery Grid Test**: Render `[gallery]` markup and verify side-by-side image layout and Lightbox zooming.
