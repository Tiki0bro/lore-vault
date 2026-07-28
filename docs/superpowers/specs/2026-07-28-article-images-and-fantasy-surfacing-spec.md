# Spec: LoreVault Article Image Management, Fantasy Surfacing & Lightbox Engine

**Date**: 2026-07-28  
**Status**: Approved  

---

## 1. Executive Summary

LoreVault is expanding its article presentation capabilities to support rich visual imagery. Authors can upload local images via drag-and-drop or toolbar buttons, specify dedicated Hero / Cover Banners per article, align in-text images (left, right, center, full-width) with fantasy filigree borders and captions, and zoom high-res world maps or character concept art using an interactive parchment Lightbox viewer.

---

## 2. Key Objectives & User Requirements

1. **Hybrid Upload & Insertion Workflow**:
   - **Hero / Cover Banner Field**: Dedicated header banner image field at the top of the article editor.
   - **Editor Toolbar & Drag-and-Drop Dropzone**: An "🖼️ Insert Image" toolbar button + drag-and-drop file upload zone directly inside the article body textarea.
2. **Backend Storage & API**:
   - `POST /api/upload/image` endpoint accepting PNG, JPG, WEBP, GIF, SVG files up to 10MB using `multer`.
   - Store images locally in `public/uploads/images/<timestamp>-<name>.<ext>`.
   - Add `header_image` column to SQLite database `articles` table and article markdown metadata headers.
3. **WAParser Alignment & Fantasy CSS Surfacing**:
   - Parse `[img]` and Markdown image tags with alignment, sizing, and caption options:
     - `[img align="right" width="300px" caption="Solaria Port"]url[/img]`
     - `![Caption|right](url)`
   - Render in-text images inside gold leaf / cyan filigree framed cards (`--border-filigree`) with dark parchment backgrounds and centered italic captions.
   - Render full-width Hero Banner images with a parchment gradient overlay mask behind the title.
4. **Interactive Lightbox Viewer**:
   - Clicking any article image opens a full-screen parchment Lightbox modal with high-res zoom, caption display, and keyboard (ESC) / click-outside closing.

---

## 3. Technical Breakdown

### 3.1 Backend Server Extensions (`server.js`)
- **Multer Storage Config**:
  ```javascript
  const imageStorage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, path.join(__dirname, 'public', 'uploads', 'images')),
    filename: (req, file, cb) => {
      const sanitized = file.originalname.replace(/[^a-zA-Z0-9.\-_]/g, '');
      cb(null, `${Date.now()}-${sanitized}`);
    }
  });
  const imageUpload = multer({ storage: imageStorage, limits: { fileSize: 10 * 1024 * 1024 } });
  ```
- **Upload API Endpoint**: `app.post('/api/upload/image', imageUpload.single('image'), (req, res) => { ... })`
- **Database Schema Migration**: `ALTER TABLE articles ADD COLUMN header_image TEXT`
- Update `GET`, `POST`, `PUT` article endpoints to handle `header_image`.

### 3.2 Frontend Editor & Drag-and-Drop (`public/js/app.js` & `public/index.html`)
- Add `#article-header-image-input` and `#upload-header-image-btn` to Article Editor modal.
- Add `#insert-image-btn` toolbar item.
- Attach `dragover`, `dragleave`, and `drop` event listeners to `#article-content-input`. Automatically post dropped files to `/api/upload/image` and insert `[img]/uploads/images/filename[/img]` at cursor position.

### 3.3 Parser & CSS Styling (`public/js/wa-parser.js` & `public/css/styles.css`)
- **WAParser Image Parsing**:
  ```javascript
  html = html.replace(/\[img\b([^\]]*)\]([\s\S]*?)\[\/img\]/gi, (match, attrsStr, src) => {
    // Parse align, width, caption attributes
    return `<figure class="wa-image-card ${alignClass}" style="${widthStyle}">
              <div class="wa-image-frame">
                <img src="${cleanSrc}" class="wa-image" alt="${caption}" onclick="window.openImageLightbox('${cleanSrc}', '${caption}')" />
              </div>
              ${caption ? `<figcaption class="wa-image-caption">${caption}</figcaption>` : ''}
            </figure>`;
  });
  ```
- **CSS Styling (`styles.css`)**:
  - `.wa-article-banner`: Height 240px-320px, object-fit cover, gold filigree bottom trim, parchment dark fade gradient.
  - `.wa-image-card`: Gold filigree frame (`--border-filigree`), dark parchment container, hover glow shadow.
  - `.align-left` / `.align-right`: Float left/right with 1.25rem margins and text wrapping.

### 3.4 Interactive Lightbox Modal (`public/index.html` & `public/js/app.js`)
- Modal container `#article-image-lightbox`.
- Global trigger `window.openImageLightbox(src, caption)`.

---

## 4. Verification Plan

1. **Upload API Test**: Upload test image via `/api/upload/image` and confirm file is created in `public/uploads/images/` and returned in JSON response.
2. **Editor & Drag-and-Drop Test**: Test cover image input and drag-and-drop file upload in Article Editor.
3. **Parser & Layout Test**: Verify `[img align="right"]` and `![Caption|left]` render with gold filigree frames and floating text wrap in both `ancient-codex` and `scifi-fantasy` themes.
4. **Lightbox Test**: Click article image and verify lightbox opens with high-res zoom and closes on ESC/backdrop click.
